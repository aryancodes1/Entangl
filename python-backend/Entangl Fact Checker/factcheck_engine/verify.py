import google.generativeai as genai
import json

# Allow both package & direct execution
try:
    from .settings import GEMINI_API_KEY
    from .prompt_store import FACT_CHECK_PROMPT
except ImportError:
    from settings import GEMINI_API_KEY
    from prompt_store import FACT_CHECK_PROMPT

genai.configure(api_key=GEMINI_API_KEY)

# ------------------ STRICT JSON SCHEMA ------------------
FACT_SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": ["true", "false", "uncertain"]},
        "confidence": {"type": "number"},
        "explanation": {"type": "string"},
    },
    "required": ["verdict", "confidence", "explanation"]
}
# ---------------------------------------------------------

def verify_claim_with_llm(claim: str, evidence: list):
    model = genai.GenerativeModel(
        "models/gemini-2.5-pro",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": FACT_SCHEMA     # Strict JSON mode
        }
    )

    # Build evidence text
    evidence_text = ""
    for i, e in enumerate(evidence):
        evidence_text += f"[{i}] {e['source']} | {e['title']}\nSnippet: {e['snippet']}\n\n"

    prompt = f"""
You are a fact-checking model.

CLAIM:
{claim}

EVIDENCE:
{evidence_text}

Return ONLY a JSON object matching the schema.
"""

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)   # always valid JSON
    except Exception as e:
        return {
            "verdict": "uncertain",
            "confidence": 0,
            "explanation": f"LLM error: {e}"
        }
