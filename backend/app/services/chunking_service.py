from typing import Any, Dict, List
from app.core.config import settings
from app.utils.logger import logger

def estimate_token_count(text: str) -> int:
    """Estimates token count (~4 characters per token for English/Financial text)."""
    return max(1, len(text) // 4)

def split_text_recursive(
    text: str,
    max_chunk_size: int,
    overlap: int,
    separators: List[str] = None
) -> List[str]:
    """
    Recursively splits text into chunks under max_chunk_size with overlap,
    prioritizing natural document boundaries: paragraph -> newline -> sentence -> phrase -> word.
    """
    if separators is None:
        separators = ["\n\n", "\n", ". ", "; ", ", ", " "]

    if len(text) <= max_chunk_size:
        return [text] if text.strip() else []

    # Choose the most significant separator present in the text
    chosen_separator = ""
    for sep in separators:
        if sep in text:
            chosen_separator = sep
            break

    splits = text.split(chosen_separator) if chosen_separator else list(text)

    chunks: List[str] = []
    current_chunk = ""

    for segment in splits:
        candidate = f"{current_chunk}{chosen_separator}{segment}" if current_chunk else segment
        if len(candidate) <= max_chunk_size:
            current_chunk = candidate
        else:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            
            # If a single segment is itself larger than max_chunk_size, recursively split it with finer separators
            if len(segment) > max_chunk_size:
                finer_separators = separators[separators.index(chosen_separator) + 1:] if chosen_separator in separators else []
                sub_chunks = split_text_recursive(segment, max_chunk_size, overlap, finer_separators)
                chunks.extend(sub_chunks)
                current_chunk = ""
            else:
                # Retain overlap from end of previous chunk if possible
                if overlap > 0 and len(current_chunk) > overlap:
                    overlap_prefix = current_chunk[-overlap:]
                    current_chunk = f"{overlap_prefix}{chosen_separator}{segment}"
                else:
                    current_chunk = segment

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks

def chunk_document_pages(
    pages: List[Dict[str, Any]],
    chunk_size: int = None,
    chunk_overlap: int = None
) -> List[Dict[str, Any]]:
    """
    Chunks document text page-by-page to guarantee that every chunk
    retains its exact originating page number for citations.
    """
    size = chunk_size or settings.CHUNK_SIZE
    overlap = chunk_overlap or settings.CHUNK_OVERLAP

    final_chunks: List[Dict[str, Any]] = []
    global_index = 0

    for page_data in pages:
        page_num = page_data["page_number"]
        page_text = page_data["text"]

        if not page_text or len(page_text.strip()) < 10:
            continue

        raw_chunks = split_text_recursive(page_text, max_chunk_size=size, overlap=overlap)

        for text_piece in raw_chunks:
            piece = text_piece.strip()
            if not piece:
                continue

            final_chunks.append({
                "chunk_index": global_index,
                "page_number": page_num,
                "chunk_text": piece,
                "token_count": estimate_token_count(piece),
                "char_length": len(piece)
            })
            global_index += 1

    logger.info(
        f"Document chunking complete: Generated {len(final_chunks)} chunks across {len(pages)} pages (size={size}, overlap={overlap})."
    )
    return final_chunks

