import json
from groq import Groq

# Allow both runtime modes (package + direct)
try:
    from .settings import GROQ_API_KEY, GROQ_MODEL_NAME
    from .prompt_store import FACT_CHECK_PROMPT
except ImportError:
    from settings import GROQ_API_KEY, GROQ_MODEL_NAME
    from prompt_store import FACT_CHECK_PROMPT

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

    client = Groq(api_key=GROQ_API_KEY)

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

Your output MUST be a single JSON object and nothing else.
"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=GROQ_MODEL_NAME,
            response_format={"type": "json_object"},
        )
        response_text = chat_completion.choices[0].message.content
        return json.loads(response_text)

    except Exception as e:
        return {
            "verdict": "uncertain",
            "confidence": 0,
            "explanation": f"LLM error: {e}",
            "used_evidence_indices": []
        }
