from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import faiss
import numpy as np

from app.config import settings


class IndexPersistenceError(RuntimeError):
    pass


@dataclass(frozen=True)
class VectorMatch:
    feedback_id: uuid.UUID
    score: float


class DatasetFaissStore:
    """A dataset index isolated under a UUID-only workspace path."""

    def __init__(self, workspace_id: uuid.UUID, dataset_id: uuid.UUID, root: Path | None = None):
        self.workspace_id = uuid.UUID(str(workspace_id))
        self.dataset_id = uuid.UUID(str(dataset_id))
        self.root = Path(root or settings.FAISS_INDEX_DIR).resolve()
        self.path = self.root / str(self.workspace_id) / str(self.dataset_id)
        self.index_path = self.path / "index.faiss"
        self.mapping_path = self.path / "mapping.json"

    def build(self, vectors: np.ndarray, feedback_ids: Iterable[uuid.UUID]) -> None:
        ids = [str(uuid.UUID(str(item))) for item in feedback_ids]
        vectors = self._vectors(vectors)
        if len(ids) != len(vectors):
            raise ValueError("Every vector must have exactly one feedback ID")
        index = faiss.IndexFlatIP(settings.EMBEDDING_DIMENSION)
        if len(vectors):
            index.add(vectors)
        self._write(index, ids)

    def add(self, vectors: np.ndarray, feedback_ids: Iterable[uuid.UUID]) -> int:
        ids = [str(uuid.UUID(str(item))) for item in feedback_ids]
        vectors = self._vectors(vectors)
        if not ids:
            return 0
        if len(ids) != len(vectors):
            raise ValueError("Every vector must have exactly one feedback ID")
        index, mapping = self.load()
        existing = set(mapping)
        pairs = [(vector, feedback_id) for vector, feedback_id in zip(vectors, ids) if feedback_id not in existing]
        if not pairs:
            return 0
        additions = np.ascontiguousarray(np.asarray([pair[0] for pair in pairs], dtype=np.float32))
        index.add(additions)
        mapping.extend(pair[1] for pair in pairs)
        self._write(index, mapping)
        return len(pairs)

    def load(self):
        if not self.index_path.exists() or not self.mapping_path.exists():
            raise IndexPersistenceError("Vector index files are missing")
        try:
            index = faiss.read_index(str(self.index_path))
            payload = json.loads(self.mapping_path.read_text(encoding="utf-8"))
            mapping = payload["feedback_ids"]
            if payload.get("workspace_id") != str(self.workspace_id) or payload.get("dataset_id") != str(self.dataset_id):
                raise IndexPersistenceError("Vector mapping does not match the requested index")
            if index.d != settings.EMBEDDING_DIMENSION or index.ntotal != len(mapping):
                raise IndexPersistenceError("Vector index and ID mapping are inconsistent")
            return index, [str(uuid.UUID(value)) for value in mapping]
        except (OSError, ValueError, KeyError, json.JSONDecodeError, RuntimeError) as exc:
            if isinstance(exc, IndexPersistenceError):
                raise
            raise IndexPersistenceError("Vector index could not be loaded") from exc

    def search(self, query_vector: np.ndarray, top_k: int) -> list[VectorMatch]:
        if top_k < 1:
            raise ValueError("top_k must be at least 1")
        index, mapping = self.load()
        if index.ntotal == 0:
            return []
        query = self._vectors(np.asarray(query_vector, dtype=np.float32).reshape(1, -1))
        scores, positions = index.search(query, min(top_k, index.ntotal))
        return [VectorMatch(feedback_id=uuid.UUID(mapping[position]), score=float(score)) for score, position in zip(scores[0], positions[0]) if position >= 0]

    @staticmethod
    def _vectors(vectors: np.ndarray) -> np.ndarray:
        vectors = np.asarray(vectors, dtype=np.float32)
        if vectors.ndim != 2 or vectors.shape[1] != settings.EMBEDDING_DIMENSION:
            raise ValueError(f"Expected vectors with dimension {settings.EMBEDDING_DIMENSION}")
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        if np.any(norms == 0):
            raise ValueError("Vectors must not contain a zero vector")
        return np.ascontiguousarray(vectors / norms, dtype=np.float32)

    def _write(self, index, mapping: list[str]) -> None:
        self.path.mkdir(parents=True, exist_ok=True)
        index_tmp = self.index_path.with_suffix(".faiss.tmp")
        mapping_tmp = self.mapping_path.with_suffix(".json.tmp")
        faiss.write_index(index, str(index_tmp))
        mapping_tmp.write_text(json.dumps({"version": 1, "workspace_id": str(self.workspace_id), "dataset_id": str(self.dataset_id), "feedback_ids": mapping}), encoding="utf-8")
        os.replace(index_tmp, self.index_path)
        os.replace(mapping_tmp, self.mapping_path)
