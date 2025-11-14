"""
Prompt template for the LLM verification step.
We pass in the claim and evidence; the LLM must respond *ONLY* with JSON.
"""

LLM_PROMPT_TEMPLATE = """
You are a strict factual verification assistant. You will be given:
- a short single-line Claim
- up to {max_snippets} pieces of Evidence (each with source and snippet)

INSTRUCTIONS:
1) Use ONLY the evidence provided. Do NOT rely on any other knowledge.
2) If the evidence clearly supports the claim, return "true".
3) If the evidence clearly refutes the claim, return "false".
4) If the evidence is insufficient, ambiguous, or contradictory, return "uncertain".
5) Provide a numeric confidence between 0.0 and 1.0.
6) Output STRICTLY a single JSON object and nothing else.

JSON schema (exact keys):
{{
  "result": "true" | "false" | "uncertain",
  "confidence": 0.0 to 1.0,
  "explanation": "One short sentence (under 40 words).",
  "used_evidence": [  // list of indices (1-based) of evidence items you used
    1, 2
  ]
}}

Claim:
"""  # We'll append claim and evidence when building the prompt.
