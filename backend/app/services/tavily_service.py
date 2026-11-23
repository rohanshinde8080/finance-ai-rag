import os
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
import httpx
from app.core.config import settings
from app.utils.logger import logger

# Official Indian regulatory & government portals for financial information
OFFICIAL_FINANCE_DOMAINS = [
    "rbi.org.in",
    "incometax.gov.in",
    "incometaxindia.gov.in",
    "sebi.gov.in",
    "gst.gov.in",
    "irdai.gov.in",
    "pfrda.org.in",
    "india.gov.in",
    "finmin.nic.in",
    "financialservices.gov.in",
    "cbic.gov.in"
]

TAVILY_SEARCH_URL = "https://api.tavily.com/search"

def search_official_web(
    query: str,
    max_results: int = 5,
    search_depth: str = "advanced"
) -> List[Dict[str, Any]]:
    """
    Executes a web search via Tavily API restricted to official Indian financial domains.
    Prioritizes regulatory accuracy over general web content.
    """
    api_key = settings.TAVILY_API_KEY or os.environ.get("TAVILY_API_KEY", "")
    if not api_key or api_key == "placeholder_tavily_api_key":
        logger.warning(
            "TAVILY_API_KEY is not configured or is a placeholder. Web search fallback unavailable."
        )
        return []

    payload = {
        "api_key": api_key,
        "query": f"{query} site:gov.in OR site:rbi.org.in OR site:sebi.gov.in",
        "search_depth": search_depth,
        "include_domains": OFFICIAL_FINANCE_DOMAINS,
        "max_results": max_results,
        "include_answer": False,
        "include_raw_content": False
    }

    try:
        logger.info(f"Querying Tavily for official financial sources: '{query}'...")
        with httpx.Client(timeout=10.0) as client:
            response = client.post(TAVILY_SEARCH_URL, json=payload)
            response.raise_for_status()
            data = response.json()

        raw_results = data.get("results", [])
        formatted_results: List[Dict[str, Any]] = []

        for item in raw_results:
            raw_url = item.get("url", "")
            domain = urlparse(raw_url).netloc.lower()
            snippet = item.get("content", "").strip()

            formatted_results.append({
                "title": item.get("title", "Official Financial Source"),
                "url": raw_url,
                "snippet": snippet,
                "score": round(item.get("score", 0.0), 4),
                "domain": domain
            })

        logger.info(f"Tavily returned {len(formatted_results)} official search results.")
        return formatted_results

    except httpx.HTTPStatusError as e:
        logger.error(f"Tavily API returned HTTP status {e.response.status_code}: {e.response.text}")
        return []
    except Exception as e:
        logger.error(f"Error querying Tavily API: {e}")
        return []

