import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.conversation import ConversationCreate, ConversationResponse, MessageCreate
from app.services import rag as rag_service

router = APIRouter(prefix="/conversations", tags=["Conversations"])


def _message_data(message):
    return {"id": str(message.id), "conversation_id": str(message.conversation_id), "role": message.role, "content": message.content, "provider": message.provider, "model": message.model, "created_at": message.created_at.isoformat()}


@router.post("", status_code=status.HTTP_201_CREATED)
def create(payload: ConversationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = rag_service.create_conversation(db, workspace_id=payload.workspace_id, user_id=current_user.id, title=payload.title)
    return {"success": True, "data": ConversationResponse.model_validate(item).model_dump(mode="json")}


@router.get("")
def list_all(workspace_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"success": True, "data": [ConversationResponse.model_validate(item).model_dump(mode="json") for item in rag_service.list_conversations(db, workspace_id=workspace_id, user_id=current_user.id)]}


@router.get("/{conversation_id}")
def get_one(conversation_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conversation = rag_service.get_conversation(db, conversation_id=conversation_id, user_id=current_user.id)
    return {"success": True, "data": {**ConversationResponse.model_validate(conversation).model_dump(mode="json"), "messages": [_message_data(m) for m in conversation.messages]}}


@router.delete("/{conversation_id}")
def delete(conversation_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rag_service.delete_conversation(db, conversation_id=conversation_id, user_id=current_user.id)
    return {"success": True, "data": {"message": "Conversation deleted"}}


@router.post("/{conversation_id}/messages")
async def message(conversation_id: uuid.UUID, payload: MessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = await rag_service.answer_message(db, conversation_id=conversation_id, user_id=current_user.id, content=payload.content, dataset_id=payload.dataset_id)
    return {"success": True, "data": {"message": _message_data(result["message"]), "answer": result["answer"], "evidence": result["evidence"], "retrieval_metadata": result["retrieval_metadata"]}}
