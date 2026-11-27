from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.models.chat import DocumentCitation, WebSourceCitation, RAGResponse
from app.services.faiss_service import search_similar_chunks
from app.services.gemini_service import (
    generate_document_grounded_answer,
    generate_web_grounded_answer,
    MANDATORY_FINANCIAL_DISCLAIMER
)
from app.services.tavily_service import search_official_web
from app.utils.logger import logger

def answer_financial_query(
    question: str,
    category: Optional[str] = None,
    language: Optional[str] = "English"
) -> RAGResponse:
    """
    Master RAG Orchestrator:
    1. Evaluates in-memory vector similarity via FAISS and PostgreSQL.
    2. Gated threshold check:
       - If Max Similarity >= SIMILARITY_THRESHOLD (default 0.70):
         Grounds strictly in internal documents and returns document/page citations.
       - If Max Similarity < SIMILARITY_THRESHOLD:
         Triggers Tavily official portal search and returns live regulatory citations.
    """
    logger.info(f"Processing financial query: '{question}' (Category filter: {category})")

    # Step 1: Semantic search in uploaded documents
    chunks = search_similar_chunks(
        query=question,
        top_k=settings.TOP_K_CHUNKS,
        category=category
    )

    max_similarity = chunks[0]["similarity_score"] if chunks else 0.0
    logger.info(f"Retrieved {len(chunks)} chunks. Max similarity score: {max_similarity:.4f}")

    # Step 2: Determine grounding route
    if chunks and max_similarity >= settings.SIMILARITY_THRESHOLD:
        logger.info(f"Relevance score ({max_similarity:.4f}) meets threshold ({settings.SIMILARITY_THRESHOLD}). Routing to Document Grounding.")
        
        answer_text = generate_document_grounded_answer(question, chunks, language=language)
        
        # Build document citations
        citations = [
            DocumentCitation(
                chunk_id=c["chunk_id"],
                document_title=c.get("document_title", "Official Regulatory Document"),
                category=c.get("category", "General"),
                page_number=c.get("page_number", 1),
                snippet=c.get("chunk_text", "")[:200] + "...",
                similarity_score=c.get("similarity_score", 0.0)
            )
            for c in chunks
        ]

        return RAGResponse(
            answer=answer_text,
            source_type="document",
            confidence_score=max_similarity,
            citations=citations,
            web_sources=[],
            disclaimer=MANDATORY_FINANCIAL_DISCLAIMER
        )

    # Step 3: Insufficient document context -> Fallback to Tavily Web Search
    logger.info(
        f"Internal context insufficient (max_score={max_similarity:.4f} < {settings.SIMILARITY_THRESHOLD}). Triggering Tavily Official Fallback..."
    )
    web_results = search_official_web(query=question, max_results=4)

    if web_results:
        answer_text = generate_web_grounded_answer(question, web_results, language=language)
        
        web_sources = [
            WebSourceCitation(
                title=w.get("title", "Official Source"),
                url=w.get("url", ""),
                snippet=w.get("snippet", ""),
                score=w.get("score"),
                domain=w.get("domain", "")
            )
            for w in web_results
        ]

        return RAGResponse(
            answer=answer_text,
            source_type="web",
            confidence_score=web_results[0].get("score", 0.6) if web_results else 0.5,
            citations=[],
            web_sources=web_sources,
            disclaimer=MANDATORY_FINANCIAL_DISCLAIMER
        )

    # Step 4: Both document context and web search unavailable
    logger.warning("Both internal documents and official web search yielded insufficient information.")
    fallback_message = "Sorry, I could not find this question answer in this financial policy."

    return RAGResponse(
        answer=fallback_message,
        source_type="fallback",
        confidence_score=0.0,
        citations=[],
        web_sources=[],
        disclaimer=MANDATORY_FINANCIAL_DISCLAIMER
    )

