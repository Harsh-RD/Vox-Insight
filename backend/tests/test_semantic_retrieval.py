import sys
import types
import uuid

import numpy as np
import pytest

from app.embeddings import registry
from app.embeddings.service import embed_texts
from app.vector_store.faiss_store import DatasetFaissStore, IndexPersistenceError


def vectors(*coordinates: int) -> np.ndarray:
    output = np.zeros((len(coordinates), 384), dtype=np.float32)
    for row, coordinate in enumerate(coordinates):
        output[row, coordinate] = 1.0
    return output


def test_embedding_batch_normalizes_and_uses_lazy_singleton(monkeypatch):
    calls = []
    model_loads = []

    class FakeModel:
        def encode(self, texts, **kwargs):
            calls.append((list(texts), kwargs))
            return np.array([[3.0] + [0.0] * 383 for _ in texts], dtype=np.float32)

    registry.clear_embedding_model_cache()
    def loader(*args, **kwargs):
        model_loads.append((args, kwargs))
        return FakeModel()

    monkeypatch.setitem(sys.modules, "sentence_transformers", types.SimpleNamespace(SentenceTransformer=loader))
    result = embed_texts(["first", "second"])
    assert result.shape == (2, 384)
    assert np.allclose(np.linalg.norm(result, axis=1), 1.0)
    embed_texts(["third"])
    assert len(calls) == 2
    assert len(model_loads) == 1
    registry.clear_embedding_model_cache()


def test_embedding_rejects_empty_text_without_loading_model():
    with pytest.raises(ValueError, match="must not be empty"):
        embed_texts(["  "])


def test_store_build_persist_load_search_and_incremental_add(tmp_path):
    workspace_id, dataset_id = uuid.uuid4(), uuid.uuid4()
    ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]
    store = DatasetFaissStore(workspace_id, dataset_id, root=tmp_path)
    store.build(vectors(0, 1), ids[:2])
    assert store.index_path.exists() and store.mapping_path.exists()
    loaded, mapping = store.load()
    assert loaded.ntotal == 2 and mapping == [str(ids[0]), str(ids[1])]
    assert store.search(vectors(0)[0], 10)[0].feedback_id == ids[0]
    assert store.add(vectors(2), [ids[2]]) == 1
    assert store.add(vectors(2), [ids[2]]) == 0
    assert [match.feedback_id for match in store.search(vectors(2)[0], 5)][0] == ids[2]


def test_store_handles_missing_or_corrupt_persistence(tmp_path):
    store = DatasetFaissStore(uuid.uuid4(), uuid.uuid4(), root=tmp_path)
    with pytest.raises(IndexPersistenceError):
        store.load()
    store.path.mkdir(parents=True)
    store.index_path.write_bytes(b"broken")
    store.mapping_path.write_text("{}")
    with pytest.raises(IndexPersistenceError):
        store.load()


def test_store_rejects_invalid_top_k_and_dimension(tmp_path):
    store = DatasetFaissStore(uuid.uuid4(), uuid.uuid4(), root=tmp_path)
    feedback_id = uuid.uuid4()
    store.build(vectors(0), [feedback_id])
    with pytest.raises(ValueError):
        store.search(vectors(0)[0], 0)
    with pytest.raises(ValueError):
        store.build(np.zeros((1, 2), dtype=np.float32), [feedback_id])


def test_store_normalizes_vectors_for_cosine_similarity(tmp_path):
    store = DatasetFaissStore(uuid.uuid4(), uuid.uuid4(), root=tmp_path)
    first, second = uuid.uuid4(), uuid.uuid4()
    raw_vectors = np.zeros((2, 384), dtype=np.float32)
    raw_vectors[0, 0] = 10.0
    raw_vectors[1, 1] = 2.0
    store.build(raw_vectors, [first, second])
    query = np.zeros(384, dtype=np.float32)
    query[0] = 5.0
    match = store.search(query, 1)[0]
    assert match.feedback_id == first
    assert match.score == pytest.approx(1.0)
