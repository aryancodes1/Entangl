import json
from .fetch import collect_evidence
from .verify import verify_claim_with_llm


def check_fact(claim: str):
    evidence = collect_evidence(claim)
    result_json = verify_claim_with_llm(claim, evidence)

    try:
        result = json.loads(result_json)
        result["claim"] = claim
        result["sources"] = evidence
        return result
    except:
        return {
            "claim": claim,
            "verdict": "uncertain",
            "confidence": 0,
            "explanation": "Invalid JSON from LLM",
            "sources": evidence
        }
