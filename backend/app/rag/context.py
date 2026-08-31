from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ContextItem:
    feedback_id: str
    dataset_id: str
    similarity_score: float
    text: str


def build_context(results: list[dict], *, max_items: int, max_chars: int) -> tuple[list[ContextItem], str]:
    """Bound untrusted feedback while preserving its provenance and exact text."""
    items: list[ContextItem] = []
    blocks: list[str] = []
    used = 0
    for result in results[:max_items]:
        remaining = max_chars - used
        if remaining <= 0:
            break
        excerpt = result["text"][:max(0, remaining - 180)]
        if not excerpt:
            break
        item = ContextItem(str(result["feedback_id"]), str(result["dataset_id"]), float(result["similarity_score"]), excerpt)
        block = ("<feedback-evidence untrusted=\"true\">\n"
                 f"feedback_id: {item.feedback_id}\n"
                 f"dataset_id: {item.dataset_id}\n"
                 f"similarity: {item.similarity_score:.4f}\ntext:\n{item.text}\n"
                 "</feedback-evidence>")
        if used + len(block) > max_chars:
            break
        items.append(item)
        blocks.append(block)
        used += len(block)
    return items, "\n\n".join(blocks)
