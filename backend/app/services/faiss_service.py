import os
from pathlib import Path
import threading
from typing import Any, Dict, List, Optional, Tuple
import faiss
import numpy as np
from app.core.config import settings
from app.db.connection import get_db_cursor
from app.services.embedding_service import compute_embedding
from app.utils.logger import logger

class FAISSIndexManager:
    """
    Thread-safe FAISS Vector Index Manager.
    - Uses IndexFlatIP with IndexIDMap2 for Cosine Similarity search.
    - Vector IDs map 1:1 to PostgreSQL document_chunks.id.
    - Persists index to disk and automatically recovers from PostgreSQL on cold start.
    """
    _instance: Optional["FAISSIndexManager"] = None
    _lock = threading.Lock()

    def __init__(self):
        self.dimension = settings.EMBEDDING_DIMENSION
        self.index_path = settings.INDICES_DIR / "finance_index.faiss"
        self._rw_lock = threading.Lock()
        self.index: Optional[faiss.IndexIDMap2] = None
        self._init_index()

    @classmethod
    def get_instance(cls) -> "FAISSIndexManager":
        """Singleton instance accessor."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _init_index(self) -> None:
        """Initializes the FAISS index structure."""
        base_index = faiss.IndexFlatIP(self.dimension)
        self.index = faiss.IndexIDMap2(base_index)

    def get_total_vectors(self) -> int:
        """Returns the total number of indexed vectors in memory."""
        with self._rw_lock:
            return self.index.ntotal if self.index is not None else 0

    def add_vectors(self, chunk_ids: List[int], embeddings: List[List[float]]) -> None:
        """
        Adds vectors to the FAISS index with explicit IDs matching PostgreSQL chunk IDs.
        Vectors must already be L2-normalized.
        """
        if not chunk_ids or not embeddings:
            return

        if len(chunk_ids) != len(embeddings):
            raise ValueError("chunk_ids and embeddings must have the same length.")

        vectors_np = np.ascontiguousarray(embeddings, dtype=np.float32)
        ids_np = np.ascontiguousarray(chunk_ids, dtype=np.int64)

        with self._rw_lock:
            self.index.add_with_ids(vectors_np, ids_np)
            logger.info(
                f"Added {len(chunk_ids)} vectors to FAISS index. Total index count: {self.index.ntotal}"
            )
            self._save_index_unlocked()

    def remove_vectors(self, chunk_ids: List[int]) -> int:
        """
        Removes vectors from the FAISS index by chunk ID.
        Returns the number of vectors successfully removed.
        """
        if not chunk_ids:
            return 0

        ids_np = np.ascontiguousarray(chunk_ids, dtype=np.int64)
        with self._rw_lock:
            removed_count = self.index.remove_ids(ids_np)
            logger.info(
                f"Removed {removed_count} vectors from FAISS index. Remaining: {self.index.ntotal}"
            )
            self._save_index_unlocked()
            return removed_count

    def search(self, query_vector: List[float], top_k: int = 4) -> List[Tuple[int, float]]:
        """
        Performs inner product (cosine) similarity search for top-k nearest chunks.
        Returns a list of (chunk_id, similarity_score) sorted descending by score.
        """
        if self.index is None or self.index.ntotal == 0:
            return []

        query_np = np.ascontiguousarray([query_vector], dtype=np.float32)

        with self._rw_lock:
            # Query top_k neighbors
            k = min(top_k, self.index.ntotal)
            distances, indices = self.index.search(query_np, k)

        results: List[Tuple[int, float]] = []
        for chunk_id, score in zip(indices[0], distances[0]):
            if chunk_id != -1:  # -1 indicates unassigned slot
                results.append((int(chunk_id), float(score)))

        return results

    def _save_index_unlocked(self) -> None:
        """Saves index to disk without acquiring lock (internal method)."""
        try:
            settings.INDICES_DIR.mkdir(parents=True, exist_ok=True)
            faiss.write_index(self.index, str(self.index_path))
            logger.info(f"FAISS index successfully saved to {self.index_path}")
        except Exception as e:
            logger.error(f"Failed to save FAISS index to disk: {e}")

    def save_index(self) -> None:
        """Thread-safe public save method."""
        with self._rw_lock:
            self._save_index_unlocked()

    def load_or_rebuild_index(self) -> None:
        """
        Loads index from disk if present; otherwise rebuilds from PostgreSQL document_chunks.
        Ensures zero vector divergence on server boot or recovery.
        """
        with self._rw_lock:
            if self.index_path.exists():
                try:
                    logger.info(f"Loading existing FAISS index from {self.index_path}...")
                    loaded_index = faiss.read_index(str(self.index_path))
                    self.index = loaded_index
                    logger.info(f"FAISS index loaded. Total indexed vectors: {self.index.ntotal}")
                    return
                except Exception as e:
                    logger.warning(f"Failed to load FAISS index file ({e}). Rebuilding from DB...")

            # Rebuild index from PostgreSQL
            logger.info("Rebuilding FAISS index from PostgreSQL document_chunks...")
            self._init_index()

            try:
                with get_db_cursor() as cur:
                    cur.execute("SELECT id, embedding FROM document_chunks ORDER BY id ASC;")
                    rows = cur.fetchall()

                if not rows:
                    logger.info("PostgreSQL document_chunks is empty. Initialized clean index.")
                    return

                chunk_ids = [row["id"] for row in rows]
                # Embeddings are stored as lists/arrays from pgvector
                embeddings = [list(row["embedding"]) for row in rows]

                vectors_np = np.ascontiguousarray(embeddings, dtype=np.float32)
                ids_np = np.ascontiguousarray(chunk_ids, dtype=np.int64)

                self.index.add_with_ids(vectors_np, ids_np)
                self._save_index_unlocked()
                logger.info(f"FAISS index rebuilt with {len(chunk_ids)} vectors from PostgreSQL.")
            except Exception as e:
                logger.error(f"Database error while rebuilding FAISS index: {e}")

faiss_manager = FAISSIndexManager.get_instance()

def search_similar_chunks(
    query: str,
    top_k: int = 4,
    category: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    End-to-end semantic retrieval:
    1. Computes normalized query vector via SentenceTransformers.
    2. Searches FAISS for top-k matching chunk IDs.
    3. Fetches full chunk texts and document metadata from PostgreSQL.
    4. Attaches similarity score and returns sorted chunk results.
    """
    if faiss_manager.get_total_vectors() == 0:
        return []

    # 1. Generate query embedding
    query_vector = compute_embedding(query)

    # 2. Query FAISS index (fetch extra if category filter applied)
    fetch_k = top_k * 3 if category else top_k
    faiss_matches = faiss_manager.search(query_vector, top_k=fetch_k)

    if not faiss_matches:
        return []

    chunk_ids = [cid for cid, _ in faiss_matches]
    score_map = {cid: score for cid, score in faiss_matches}

    # 3. Retrieve chunks & document metadata from PostgreSQL
    with get_db_cursor() as cur:
        query_sql = """
            SELECT c.id AS chunk_id, c.document_id, c.chunk_index, c.page_number,
                   c.chunk_text, c.token_count,
                   d.title AS document_title, d.category, d.original_filename
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.id = ANY(%s)
        """
        params: List[Any] = [chunk_ids]

        if category:
            query_sql += " AND d.category = %s"
            params.append(category)

        cur.execute(query_sql, tuple(params))
        db_rows = cur.fetchall()

    # 4. Attach similarity scores and sort by score descending
    results = []
    for row in db_rows:
        chunk_dict = dict(row)
        chunk_dict["similarity_score"] = round(score_map.get(row["chunk_id"], 0.0), 4)
        results.append(chunk_dict)

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results[:top_k]

