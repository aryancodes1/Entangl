import json
from .fetch import collect_evidence
from .verify import verify_claim_with_llm


def check_fact(claim: str):
    evidence = collect_evidence(claim)
    result = verify_claim_with_llm(claim, evidence)

    # Ensure dict
    if not isinstance(result, dict):
        result = {
            "verdict": "uncertain",
            "confidence": 0,
            "explanation": "Invalid JSON from LLM",
            "used_evidence_indices": []
        }

    result["claim"] = claim
    result["sources"] = evidence
    return result
