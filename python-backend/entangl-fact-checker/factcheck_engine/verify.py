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
    "required": ["verdict", "confidence", "explanation", "used_evidence_indices"]
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
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": "fact_check_result",
                        "description": "The result of the fact check.",
                        "parameters": FACT_SCHEMA,
                    },
                }
            ],
            tool_choice={"type": "function", "function": {"name": "fact_check_result"}},
        )
        response_message = chat_completion.choices[0].message
        tool_call = response_message.tool_calls[0]
        function_args = tool_call.function.arguments
        return json.loads(function_args)

    except Exception as e:
        return {
            "verdict": "uncertain",
            "confidence": 0,
            "explanation": f"LLM error: {e}",
            "used_evidence_indices": []
        }
