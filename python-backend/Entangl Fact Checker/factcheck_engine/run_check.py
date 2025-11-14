"""
run_check.py
Public orchestrator function `check_fact(claim: str) -> dict`
This is the entry point your larger app will call.

Return shape:
{
  "claim": "...",
  "verdict": "true" | "false" | "uncertain",
  "confidence": 0.0 - 1.0,
  "explanation": "...",
  "sources": [ { "source":..., "title":..., "url":... }, ... ]
}
"""

from typing import List, Dict, Any
from . import fetch, verify, settings

def _format_sources(evidence: List[Dict]) -> List[Dict]:
    return [
        {"source": ev.get("source", ""), "title": ev.get("title", ""), "url": ev.get("url", "")}
        for ev in evidence
    ]

def check_fact(claim: str) -> Dict[str, Any]:
    """
    Main function to call from your app.
    """
    claim_text = claim.strip()
    if not claim_text:
        return {
            "claim": claim_text,
            "verdict": "uncertain",
            "confidence": 0.0,
            "explanation": "Empty claim provided.",
            "sources": []
        }

    # 1) Collect evidence
    evidence = fetch.collect_evidence(claim_text, max_snippets=settings.MAX_EVIDENCE_SNIPPETS)

    # 2) Analyze with LLM
    llm_result = verify.analyze_with_gemini(claim_text, evidence)

    # 3) Pack the result
    out = {
        "claim": claim_text,
        "verdict": llm_result.get("result", "uncertain"),
        "confidence": llm_result.get("confidence", 0.0),
        "explanation": llm_result.get("explanation", ""),
        "used_evidence_indices": llm_result.get("used_evidence", []),
        "sources": _format_sources(evidence)
    }
    return out

# convenience alias for importers
__all__ = ["check_fact"]
