from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.core.exceptions import AppException, NotFoundException, PermissionDeniedException
from app.llm.base import LLMProviderError
from app.llm.provider import get_llm_provider
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.message_evidence import MessageEvidence
from app.models.feedback import Feedback
from app.rag.context import build_context
from app.rag.prompts import SYSTEM_PROMPT, build_user_prompt
from app.services.dataset import get_dataset_for_user
from app.services.search import semantic_search
from app.services.workspace import get_user_workspace_membership

INSUFFICIENT_EVIDENCE = "I don't have enough relevant feedback in the selected data to answer that reliably."


def _conversation_for_user(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation:
    conversation = db.scalar(select(Conversation).options(selectinload(Conversation.messages)).where(Conversation.id == conversation_id))
    if not conversation:
        raise NotFoundException(message="Conversation not found")
    if conversation.user_id != user_id or not get_user_workspace_membership(db, user_id, conversation.workspace_id):
        raise PermissionDeniedException(message="You do not have access to this conversation")
    return conversation


def create_conversation(db: Session, *, workspace_id: uuid.UUID, user_id: uuid.UUID, title: str | None) -> Conversation:
    if not get_user_workspace_membership(db, user_id, workspace_id):
        raise PermissionDeniedException(message="You are not a member of this workspace")
    conversation = Conversation(workspace_id=workspace_id, user_id=user_id, title=(title or "New conversation").strip() or "New conversation")
    db.add(conversation); db.commit(); db.refresh(conversation)
    return conversation


def list_conversations(db: Session, *, workspace_id: uuid.UUID, user_id: uuid.UUID) -> list[Conversation]:
    if not get_user_workspace_membership(db, user_id, workspace_id):
        raise PermissionDeniedException(message="You are not a member of this workspace")
    return list(db.scalars(select(Conversation).where(Conversation.workspace_id == workspace_id, Conversation.user_id == user_id).order_by(Conversation.updated_at.desc())))


def get_conversation(db: Session, *, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation:
    return _conversation_for_user(db, conversation_id, user_id)


def delete_conversation(db: Session, *, conversation_id: uuid.UUID, user_id: uuid.UUID) -> None:
    db.delete(_conversation_for_user(db, conversation_id, user_id)); db.commit()


def _history(conversation: Conversation) -> str:
    limit = max(0, min(settings.RAG_MAX_HISTORY_MESSAGES, 50))
    return "\n".join(f"{m.role}: {m.content[:1200]}" for m in (conversation.messages[-limit:] if limit else []))


async def answer_message(db: Session, *, conversation_id: uuid.UUID, user_id: uuid.UUID, content: str, dataset_id: uuid.UUID | None) -> dict:
    conversation = _conversation_for_user(db, conversation_id, user_id)
    question = content.strip()
    if not question:
        raise AppException("Message content must not be empty", code="INVALID_MESSAGE", status_code=422)
    if dataset_id:
        dataset = get_dataset_for_user(db, dataset_id, user_id)
        if dataset.workspace_id != conversation.workspace_id:
            raise NotFoundException(message="Dataset not found in this conversation workspace")
    history = _history(conversation)
    user_message = Message(conversation_id=conversation.id, role="user", content=question)
    db.add(user_message); db.commit()
    # Keep provider context bounded even if an operator supplies an unsafe env value.
    retrieval_limit = max(1, min(settings.RAG_TOP_K, 100))
    results = semantic_search(db, workspace_id=conversation.workspace_id, query=question, top_k=retrieval_limit, dataset_id=dataset_id, user_id=user_id)
    # Defense in depth: retrieval output is untrusted metadata. Re-resolve every
    # candidate against the authorized Feedback table before context/evidence use.
    result_ids = []
    for item in results:
        try:
            result_ids.append(uuid.UUID(str(item["feedback_id"])))
        except (KeyError, ValueError, TypeError, AttributeError):
            continue
    feedback_rows = list(db.scalars(select(Feedback).where(Feedback.id.in_(result_ids), Feedback.workspace_id == conversation.workspace_id, *( [Feedback.dataset_id == dataset_id] if dataset_id else [])))) if result_ids else []
    by_id = {row.id: row for row in feedback_rows}
    authorized_results = []
    for item in results:
        try:
            feedback = by_id.get(uuid.UUID(str(item["feedback_id"])))
        except (KeyError, ValueError, TypeError, AttributeError):
            feedback = None
        if feedback is not None:
            authorized_results.append({**item, "feedback_id": str(feedback.id), "dataset_id": str(feedback.dataset_id), "text": feedback.original_text})
    relevant = [item for item in authorized_results if item["similarity_score"] >= settings.RAG_MIN_SIMILARITY]
    items, context = build_context(relevant, max_items=settings.RAG_MAX_CONTEXT_ITEMS, max_chars=settings.RAG_MAX_CONTEXT_CHARS)
    if not items:
        assistant = Message(conversation_id=conversation.id, role="assistant", content=INSUFFICIENT_EVIDENCE)
        db.add(assistant); conversation.updated_at = datetime.now(timezone.utc); db.commit(); db.refresh(assistant)
        return {"message": assistant, "answer": assistant.content, "evidence": [], "retrieval_metadata": {"retrieved_count": len(results), "evidence_count": 0, "dataset_id": str(dataset_id) if dataset_id else None, "provider": None, "model": None}}
    try:
        generation = await get_llm_provider().generate(system_prompt=SYSTEM_PROMPT, user_prompt=build_user_prompt(question=question, context=context, history=history))
    except LLMProviderError as exc:
        raise AppException(str(exc), code=exc.code, status_code=503) from exc
    assistant = Message(conversation_id=conversation.id, role="assistant", content=generation.content, provider=generation.provider, model=generation.model)
    db.add(assistant); db.flush()
    for rank, item in enumerate(items, 1):
        db.add(MessageEvidence(message_id=assistant.id, feedback_id=uuid.UUID(item.feedback_id), similarity_score=item.similarity_score, rank=rank))
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(assistant)
    evidence = [{"feedback_id": item.feedback_id, "dataset_id": item.dataset_id, "similarity_score": item.similarity_score, "rank": rank, "text": item.text} for rank, item in enumerate(items, 1)]
    return {"message": assistant, "answer": assistant.content, "evidence": evidence, "retrieval_metadata": {"retrieved_count": len(results), "evidence_count": len(items), "dataset_id": str(dataset_id) if dataset_id else None, "provider": generation.provider, "model": generation.model}}
