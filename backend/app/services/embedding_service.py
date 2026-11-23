from typing import List, Optional
import numpy as np
from app.core.config import settings
from app.utils.logger import logger

_embedding_model = None

def get_embedding_model():
    """
    Lazy singleton loader for the SentenceTransformers embedding model.
    Loads onto CPU by default with cached weights.
    """
    global _embedding_model
    if _embedding_model is None:
        try:
            logger.info(f"Loading SentenceTransformers model: '{settings.EMBEDDING_MODEL_NAME}'...")
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer(
                settings.EMBEDDING_MODEL_NAME,
                device="cpu"
            )
            logger.info(f"Embedding model loaded successfully. Dimension: {settings.EMBEDDING_DIMENSION}")
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformers model: {e}")
            raise
    return _embedding_model

def compute_embedding(text: str) -> List[float]:
    """
    Computes a normalized dense vector embedding for a single text string.
    L2 normalization ensures dot product / inner product equals cosine similarity.
    """
    model = get_embedding_model()
    # Normalize embeddings to unit length
    embedding = model.encode(
        text,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True
    )
    return embedding.tolist()

def compute_embeddings_batch(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """
    Computes normalized dense vector embeddings for a batch of text chunks.
    """
    if not texts:
        return []
    
    model = get_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True
    )
    return [emb.tolist() for emb in embeddings]

def get_model_dimension() -> int:
    """Returns the expected vector dimension."""
    return settings.EMBEDDING_DIMENSION

