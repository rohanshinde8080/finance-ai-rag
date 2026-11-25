import os
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types
from app.core.config import settings
from app.utils.logger import logger

MANDATORY_FINANCIAL_DISCLAIMER = (
    "Disclaimer: FinanceAI is an informational assistant based on public regulatory documentation "
    "and does not constitute certified financial, tax, or legal advice. Consult a qualified professional before making decisions."
)

DOCUMENT_SYSTEM_INSTRUCTION = """
You are FinanceAI, a senior domain-specific financial assistant specializing in Indian regulatory frameworks (RBI, SEBI, Income Tax, GST, IRDAI, Banking, and Personal Finance).

CRITICAL GROUNDING RULES:
1. Answer the question based STRICTLY and ONLY on the provided document context excerpts.
2. Every fact, limit, percentage, tax slab, or rule MUST be grounded in the supplied context.
3. Explicitly cite the document title, category, and page number when explaining concepts (e.g. '[Source: RBI Master Direction, Page 12]').
4. DO NOT invent, extrapolate, or hallucinate financial regulations, penalties, or exemptions.
5. If the provided context is insufficient or does not contain the answer, explicitly state what is missing.
6. Provide clear, structured, professional explanations suitable for financial comprehension.
""".strip()

WEB_SYSTEM_INSTRUCTION = """
You are FinanceAI, a senior domain-specific financial assistant.
The user's query could not be fully answered from internal regulatory documents, so verified official government and regulatory web results are provided.

CRITICAL RULES:
1. Synthesize the provided official web snippets to provide an accurate, helpful answer.
2. Explicitly cite the official source portals and relevant URLs provided in the context.
3. Do not assume or extrapolate figures not present in the sources.
4. Keep the tone professional, objective, and authoritative.
""".strip()

_gemini_client: Optional[genai.Client] = None

def get_gemini_client() -> Optional[genai.Client]:
    """Retrieves or initializes the Google Gemini client."""
    global _gemini_client
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not api_key or api_key == "placeholder_gemini_api_key":
        logger.warning("GEMINI_API_KEY is not configured or is a placeholder.")
        return None

    if _gemini_client is None:
        try:
            _gemini_client = genai.Client(api_key=api_key)
            logger.info("Google Gemini client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Google Gemini client: {e}")
            return None
    return _gemini_client

def get_language_directive(language: Optional[str]) -> str:
    """Returns explicit language instructions for the LLM."""
    if not language or language.lower() in ["english", "en"]:
        return ""
    if language.lower() in ["marathi", "mr"]:
        return "\n\nCRITICAL LANGUAGE REQUIREMENT: You MUST formulate, explain, and write your ENTIRE response in MARATHI (मराठी) using the Devanagari script. Ensure financial concepts and rules are explained clearly in fluent, natural Marathi."
    if language.lower() in ["hindi", "hi"]:
        return "\n\nCRITICAL LANGUAGE REQUIREMENT: You MUST formulate, explain, and write your ENTIRE response in HINDI (हिंदी) using the Devanagari script. Ensure financial concepts and rules are explained clearly in fluent, natural Hindi."
    return ""

def generate_document_grounded_answer(
    question: str,
    context_chunks: List[Dict[str, Any]],
    model_name: Optional[str] = None,
    language: Optional[str] = "English"
) -> str:
    """
    Generates an answer grounded strictly in retrieved financial document chunks.
    """
    client = get_gemini_client()
    if client is None:
        return (
            "Google Gemini API key is not configured in the environment. "
            "Please configure GEMINI_API_KEY in backend/.env to generate live LLM responses.\n\n"
            f"{MANDATORY_FINANCIAL_DISCLAIMER}"
        )

    # Assemble formatted context with explicit citations
    formatted_context_parts = []
    for i, chunk in enumerate(context_chunks, 1):
        doc_title = chunk.get("document_title", "Regulatory Document")
        category = chunk.get("category", "General")
        page_num = chunk.get("page_number", "Unknown")
        text = chunk.get("chunk_text", "").strip()
        formatted_context_parts.append(
            f"--- EXCERPT {i} ---\n"
            f"Document: {doc_title} | Category: {category} | Page: {page_num}\n"
            f"Content:\n{text}\n"
        )

    context_str = "\n".join(formatted_context_parts)
    user_prompt = f"""
USER FINANCIAL QUESTION:
{question}

OFFICIAL DOCUMENT CONTEXT:
{context_str}

Please provide a clear, factual answer based strictly on the above excerpts, citing the document name and page number for each key point.
""".strip()

    active_model = model_name or getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite")
    candidate_models = [active_model, "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3-flash-preview"]
    seen = set()
    models_to_try = [m for m in candidate_models if not (m in seen or seen.add(m))]

    lang_directive = get_language_directive(language)
    system_inst = DOCUMENT_SYSTEM_INSTRUCTION + lang_directive

    last_err = None
    for target_model in models_to_try:
        try:
            logger.info(f"Generating document-grounded response via Gemini ({target_model})...")
            response = client.models.generate_content(
                model=target_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_inst,
                    temperature=0.2,
                    max_output_tokens=1500
                )
            )
            return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini API attempt with {target_model} failed: {e}. Trying fallback...")
            last_err = e

    return f"Unable to generate response due to Gemini API error: {str(last_err)}"

def generate_web_grounded_answer(
    question: str,
    web_sources: List[Dict[str, Any]],
    model_name: Optional[str] = None,
    language: Optional[str] = "English"
) -> str:
    """
    Generates an answer grounded in verified official regulatory web search snippets.
    """
    client = get_gemini_client()
    if client is None:
        return (
            "Google Gemini API key is not configured in the environment. "
            "Please configure GEMINI_API_KEY in backend/.env to generate live LLM responses.\n\n"
            f"{MANDATORY_FINANCIAL_DISCLAIMER}"
        )

    formatted_web_parts = []
    for i, src in enumerate(web_sources, 1):
        title = src.get("title", "Official Source")
        url = src.get("url", "")
        snippet = src.get("snippet", "").strip()
        domain = src.get("domain", "")
        formatted_web_parts.append(
            f"--- WEB SOURCE {i} ---\n"
            f"Title: {title}\n"
            f"URL: {url} (Domain: {domain})\n"
            f"Snippet: {snippet}\n"
        )

    web_context_str = "\n".join(formatted_web_parts)
    user_prompt = f"""
USER FINANCIAL QUESTION:
{question}

OFFICIAL GOVERNMENT & REGULATORY WEB SOURCES:
{web_context_str}

Please synthesize an informative response referencing the official sources and verified URLs where applicable.
""".strip()

    active_model = model_name or getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite")
    candidate_models = [active_model, "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3-flash-preview"]
    seen = set()
    models_to_try = [m for m in candidate_models if not (m in seen or seen.add(m))]

    lang_directive = get_language_directive(language)
    system_inst = WEB_SYSTEM_INSTRUCTION + lang_directive

    last_err = None
    for target_model in models_to_try:
        try:
            logger.info(f"Generating web-grounded response via Gemini ({target_model})...")
            response = client.models.generate_content(
                model=target_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_inst,
                    temperature=0.2,
                    max_output_tokens=1500
                )
            )
            return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini API attempt with {target_model} failed: {e}. Trying fallback...")
            last_err = e

    return f"Unable to generate response due to Gemini API error: {str(last_err)}"

