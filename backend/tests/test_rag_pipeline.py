from unittest.mock import MagicMock, patch
import pytest
from app.models.chat import RAGResponse
from app.services.tavily_service import search_official_web, OFFICIAL_FINANCE_DOMAINS
from app.services.gemini_service import (
    generate_document_grounded_answer,
    generate_web_grounded_answer,
    MANDATORY_FINANCIAL_DISCLAIMER
)
from app.services.rag_service import answer_financial_query

def test_tavily_missing_key_graceful_handling():
    """Verify Tavily search returns empty list without crashing when API key is unconfigured."""
    with patch("app.services.tavily_service.settings.TAVILY_API_KEY", "placeholder_tavily_api_key"):
        results = search_official_web("Repo rate circular 2026")
        assert results == []

def test_tavily_search_parsing_with_mock():
    """Verify Tavily search correctly parses results and extracts domain."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "results": [
            {
                "title": "Monetary Policy Statement 2026 - RBI",
                "url": "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=12345",
                "content": "The Monetary Policy Committee decided to keep the policy repo rate unchanged at 6.50 percent.",
                "score": 0.945
            }
        ]
    }
    mock_response.raise_for_status.return_value = None

    with patch("app.services.tavily_service.settings.TAVILY_API_KEY", "test_valid_key"):
        with patch("httpx.Client.post", return_value=mock_response):
            results = search_official_web("RBI repo rate")
            assert len(results) == 1
            item = results[0]
            assert item["title"] == "Monetary Policy Statement 2026 - RBI"
            assert "rbi.org.in" in item["domain"]
            assert item["score"] == 0.945
            assert "6.50 percent" in item["snippet"]

def test_gemini_missing_key_returns_guidance():
    """Verify Gemini generation returns user guidance if API key is not configured."""
    with patch("app.services.gemini_service.settings.GEMINI_API_KEY", "placeholder_gemini_api_key"):
        chunks = [{"document_title": "Doc", "page_number": 1, "chunk_text": "Text"}]
        answer = generate_document_grounded_answer("Question", chunks)
        assert "GEMINI_API_KEY" in answer
        assert MANDATORY_FINANCIAL_DISCLAIMER in answer

def test_rag_orchestrator_routes_to_documents_when_similarity_high():
    """Verify RAG orchestrator chooses document grounding when similarity >= 0.70."""
    mock_chunks = [
        {
            "chunk_id": 1,
            "document_title": "Income Tax Act 1961 - Master Circular",
            "category": "Taxation",
            "page_number": 14,
            "chunk_text": "Section 80C allows deductions up to Rs. 1,50,000 for ELSS, PPF, and Life Insurance premiums.",
            "similarity_score": 0.8850
        }
    ]

    with patch("app.services.rag_service.search_similar_chunks", return_value=mock_chunks):
        with patch(
            "app.services.rag_service.generate_document_grounded_answer",
            return_value="Under Section 80C, you can claim tax deductions up to Rs. 1.5 Lakhs [Source: Income Tax Act, Page 14]."
        ):
            response: RAGResponse = answer_financial_query("What is the deduction limit under Section 80C?")
            assert response.source_type == "document"
            assert response.confidence_score == 0.8850
            assert len(response.citations) == 1
            assert response.citations[0].document_title == "Income Tax Act 1961 - Master Circular"
            assert response.citations[0].page_number == 14
            assert response.web_sources == []
            assert MANDATORY_FINANCIAL_DISCLAIMER in response.disclaimer

def test_rag_orchestrator_routes_to_web_when_similarity_low():
    """Verify RAG orchestrator falls back to Tavily web search when similarity < 0.70."""
    # Low similarity internal chunks (< 0.70)
    mock_chunks = [
        {
            "chunk_id": 99,
            "document_title": "General Banking Terms",
            "category": "Banking",
            "page_number": 2,
            "chunk_text": "General accounts terms and conditions.",
            "similarity_score": 0.4200
        }
    ]

    mock_web_results = [
        {
            "title": "GST Council 54th Meeting Decisions",
            "url": "https://www.gst.gov.in/newsandupdates/read/54th-council-meeting",
            "snippet": "GST rates on cancer drugs reduced from 12% to 5%.",
            "score": 0.8900,
            "domain": "gst.gov.in"
        }
    ]

    with patch("app.services.rag_service.search_similar_chunks", return_value=mock_chunks):
        with patch("app.services.rag_service.search_official_web", return_value=mock_web_results) as mock_web_search:
            with patch(
                "app.services.rag_service.generate_web_grounded_answer",
                return_value="The 54th GST Council meeting reduced tax rates on selected life-saving cancer drugs to 5%."
            ):
                response: RAGResponse = answer_financial_query("What were the latest decisions of the GST Council?")
                mock_web_search.assert_called_once()
                assert response.source_type == "web"
                assert response.confidence_score == 0.8900
                assert len(response.web_sources) == 1
                assert response.web_sources[0].domain == "gst.gov.in"
                assert response.citations == []
                assert MANDATORY_FINANCIAL_DISCLAIMER in response.disclaimer

def test_rag_orchestrator_total_fallback_when_both_unavailable():
    """Verify graceful fallback message when both document index and web search yield no results."""
    with patch("app.services.rag_service.search_similar_chunks", return_value=[]):
        with patch("app.services.rag_service.search_official_web", return_value=[]):
            response: RAGResponse = answer_financial_query("Random nonexistent obscure financial inquiry 99999")
            assert response.source_type == "fallback"
            assert response.confidence_score == 0.0
            assert "could not locate sufficient authoritative information" in response.answer
            assert response.citations == []
            assert response.web_sources == []
            assert MANDATORY_FINANCIAL_DISCLAIMER in response.disclaimer

