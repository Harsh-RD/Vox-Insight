from dataclasses import dataclass


@dataclass(frozen=True)
class EmbeddingModelInfo:
    name: str
    dimension: int


DEFAULT_MODEL = EmbeddingModelInfo(
    name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    dimension=384,
)
