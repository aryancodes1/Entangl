import json
import google.generativeai as genai

# Allow both runtime modes (package + direct)
try:
    from .settings import GEMINI_API_KEY, GEMINI_MODEL_NAME
    from .prompt_store import FACT_CHECK_PROMPT
except ImportError:
    from settings import GEMINI_API_KEY, GEMINI_MODEL_NAME
    from prompt_store import FACT_CHECK_PROMPT

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

FACT_SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": ["true", "false", "uncertain"]},
        "confidence": {"type": "number"},
        "explanation": {"type": "string"},
        "used_evidence_indices": {
            "type": "array",
            "items": {"type": "number"}
        }
    },
    "required": ["verdict", "confidence", "explanation"]
}


def verify_claim_with_llm(claim: str, evidence: list):
    """
    Returns a DICT, never raw JSON string.
    """

    model = genai.GenerativeModel(
        GEMINI_MODEL_NAME,
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": FACT_SCHEMA
        }
    )

    # Build evidence text
    evidence_text = ""
    for i, e in enumerate(evidence):
        evidence_text += f"[{i}] {e['source']} | {e['title']}\n{e['snippet']}\n\n"

    prompt = f"""
{FACT_CHECK_PROMPT}

CLAIM:
{claim}

EVIDENCE:
{evidence_text}

Return ONLY a JSON object following the schema.
"""

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)

    except Exception as e:
        return {
            "verdict": "uncertain",
            "confidence": 0,
            "explanation": f"LLM error: {e}",
            "used_evidence_indices": []
        }
