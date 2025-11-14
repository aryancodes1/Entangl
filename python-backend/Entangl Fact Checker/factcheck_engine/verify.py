"""
verify.py
Send claim + evidence to Gemini via google.generativeai and parse/validate the JSON response.
"""

import json
import time
import re
from typing import List, Dict, Any, Tuple
from . import settings, prompt_store

# Import google library lazily so module import doesn't fail during e.g. static analysis
try:
    import google.generativeai as genai
    HAS_GENAI = True
except Exception:
    HAS_GENAI = False

def _configure_genai():
    if not HAS_GENAI:
        raise RuntimeError("google.generativeai package not installed or failed to import.")
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in environment or settings.")
    genai.configure(api_key=settings.GEMINI_API_KEY)

def _build_prompt(claim: str, evidence: List[Dict]) -> str:
    max_snips = settings.MAX_EVIDENCE_SNIPPETS
    base = prompt_store.LLM_PROMPT_TEMPLATE.format(max_snippets=max_snips)
    prompt = base + "\nClaim:\n" + claim.strip() + "\n\nEvidence:\n"
    if not evidence:
        prompt += "No evidence available.\n"
    else:
        for idx, ev in enumerate(evidence, start=1):
            title = ev.get("title") or ""
            source = ev.get("source") or ""
            url = ev.get("url") or ""
            snippet = ev.get("snippet") or ""
            prompt += f"{idx}. Source: {source} | Title: {title} | URL: {url}\nSnippet: {snippet}\n\n"
    prompt += "\nRespond now with ONLY the JSON object specified.\n"
    return prompt

def _extract_json_from_text(text: str) -> Any:
    """
    Try to robustly extract a JSON object from free text.
    """
    # Try direct load
    text = text.strip()
    # if it's already pure json return quickly
    try:
        return json.loads(text)
    except Exception:
        pass

    # common pattern: assistant may send code fences ```json ... ```
    # remove common wrappers
    # find first { and last } and take substring
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        candidate = text[first:last+1]
        try:
            return json.loads(candidate)
        except Exception:
            # try to sanitize (replace single quotes with double quotes naive)
            candidate2 = candidate.replace("'", '"')
            try:
                return json.loads(candidate2)
            except Exception:
                pass

    # fallback: try to find "result" and "confidence" with regex and build best-effort object
    # This is an imperfect fallback but better than crashing
    res = {}
    m_result = re.search(r'"?result"?\s*[:=]\s*"?(true|false|uncertain)"?', text, re.IGNORECASE)
    m_conf = re.search(r'"?confidence"?\s*[:=]\s*([0-9]*\.?[0-9]+)', text)
    if m_result:
        res["result"] = m_result.group(1).lower()
    if m_conf:
        try:
            res["confidence"] = float(m_conf.group(1))
        except Exception:
            res["confidence"] = None
    # explanation attempt
    m_exp = re.search(r'"?explanation"?\s*[:=]\s*"(.*?)"', text)
    if m_exp:
        res["explanation"] = m_exp.group(1)
    return res if res else None

def analyze_with_gemini(claim: str, evidence: List[Dict]) -> Dict[str, Any]:
    """
    Calls the LLM, asking it to return strict JSON as per prompt_store template.
    Returns a dict: result, confidence, explanation, used_evidence (list).
    On errors or insufficient evidence, returns result 'uncertain' with low confidence.
    """
    # quick guard
    if not settings.GEMINI_API_KEY:
        return {
            "result": "uncertain",
            "confidence": 0.0,
            "explanation": "Missing Gemini API key in settings.",
            "used_evidence": []
        }

    try:
        _configure_genai()
    except Exception as e:
        return {
            "result": "uncertain",
            "confidence": 0.0,
            "explanation": f"LLM configuration error: {str(e)}",
            "used_evidence": []
        }

    prompt = _build_prompt(claim, evidence)

    # If there is no usable evidence, return uncertain quickly
    if not evidence or all(len(ev.get("snippet", "")) < settings.MIN_EVIDENCE_CHARS for ev in evidence):
        return {
            "result": "uncertain",
            "confidence": 0.0,
            "explanation": "No sufficient evidence found for verification.",
            "used_evidence": []
        }

    try:
        # Use a simple generate call; adapt if your google.generativeai SDK differs.
        model_name = settings.DEFAULT_MODEL
        # Make the call
        response = genai.generate_text(model=model_name, prompt=prompt, max_output_tokens=512, temperature=0.0)
        # The SDKs evolve; response content may differ. We try to extract string.
        # Prefer response.text or response.output[0].content if present
        text = None
        # many versions: response.text, response.output[0].content[0].text, etc.
        if hasattr(response, "text"):
            text = response.text
        else:
            # attempt to access nested fields
            try:
                outputs = getattr(response, "output", None)
                if outputs and isinstance(outputs, (list, tuple)) and len(outputs) > 0:
                    # content may be nested
                    c = outputs[0]
                    # if content is dict-like
                    if isinstance(c, dict):
                        # try common keys
                        text = c.get("content") or c.get("text") or str(c)
                    else:
                        text = str(c)
                else:
                    text = str(response)
            except Exception:
                text = str(response)

        parsed = _extract_json_from_text(text)
        if not parsed or not isinstance(parsed, dict):
            # fallback uncertain answer
            return {
                "result": "uncertain",
                "confidence": 0.0,
                "explanation": "Could not parse LLM response into JSON.",
                "used_evidence": []
            }

        # Clean and normalise fields
        result = parsed.get("result", "").lower()
        confidence = parsed.get("confidence", parsed.get("score", None))
        try:
            confidence = float(confidence) if confidence is not None else None
        except Exception:
            confidence = None

        explanation = parsed.get("explanation", "")
        used = parsed.get("used_evidence", [])
        # validate fields
        if result not in ("true", "false", "uncertain"):
            result = "uncertain"
        if confidence is None:
            confidence = 0.0

        return {
            "result": result,
            "confidence": round(float(confidence), 4),
            "explanation": explanation.strip(),
            "used_evidence": used if isinstance(used, list) else []
        }

    except Exception as e:
        # network/llm error -> return uncertain
        return {
            "result": "uncertain",
            "confidence": 0.0,
            "explanation": f"LLM call failed: {str(e)}",
            "used_evidence": []
        }
