"""
fetch.py
Functions to retrieve evidence:
- get_wikipedia_evidence(query)
- get_duckduckgo_evidence(query)
- collect_evidence(claim)

Returns a list of evidence dicts: {"source": str, "title": str, "url": str, "snippet": str}
"""

import requests
from typing import List, Dict, Optional
from duckduckgo_search import DDGS
from urllib.parse import quote_plus
from . import settings

WIKIPEDIA_SEARCH_API = "https://en.wikipedia.org/w/api.php"
WIKIPEDIA_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"

def get_wikipedia_evidence(query: str, max_results: int = 2) -> List[Dict]:
    """
    Try Wikipedia search + summary. Returns list of evidence dicts.
    """
    results = []
    try:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json",
            "srlimit": max_results
        }
        resp = requests.get(WIKIPEDIA_SEARCH_API, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        search_items = data.get("query", {}).get("search", [])
        for item in search_items[:max_results]:
            title = item.get("title")
            # fetch summary
            summary_url = WIKIPEDIA_SUMMARY_API + quote_plus(title)
            try:
                sresp = requests.get(summary_url, timeout=6)
                sresp.raise_for_status()
                summary = sresp.json().get("extract", "")
            except Exception:
                summary = item.get("snippet", "")
            url = f"https://en.wikipedia.org/wiki/{quote_plus(title)}"
            snippet = summary if len(summary) > 0 else item.get("snippet", "")
            results.append({
                "source": "Wikipedia",
                "title": title,
                "url": url,
                "snippet": snippet.strip()
            })
    except Exception:
        # Fail quietly and return what we have (possibly empty)
        pass
    return results

def get_duckduckgo_evidence(query: str, max_results: int = 3) -> List[Dict]:
    """
    Use duckduckgo_search.DDGS to fetch simple text results as fallback.
    Returns list of evidence dicts.
    """
    results = []
    try:
        with DDGS() as ddgs:
            it = ddgs.text(query, region="wt-wt", safesearch="Off", timelimit=10, max_results=max_results)
            for i, r in enumerate(it):
                # r is a dict with keys like 'title', 'body', 'href'
                title = r.get("title") or r.get("source") or ""
                snippet = r.get("body") or r.get("snippet") or ""
                url = r.get("href") or ""
                results.append({
                    "source": "DuckDuckGo",
                    "title": title.strip(),
                    "url": url,
                    "snippet": snippet.strip()
                })
                if len(results) >= max_results:
                    break
    except Exception:
        # graceful fallback: empty list
        pass
    return results

def collect_evidence(claim: str, max_snippets: Optional[int] = None) -> List[Dict]:
    """
    Master function called by the engine.
    Strategy:
      1) Try Wikipedia first (max 2)
      2) If insufficient evidence -> DuckDuckGo (fill up to max_snippets)
    """
    if max_snippets is None:
        max_snippets = settings.MAX_EVIDENCE_SNIPPETS

    query = claim.strip()
    evidence = []

    # 1) Wikipedia
    wiki = get_wikipedia_evidence(query, max_results=2)
    for w in wiki:
        if w.get("snippet"):
            evidence.append(w)
        if len(evidence) >= max_snippets:
            return evidence[:max_snippets]

    # 2) DuckDuckGo / fallback
    ddg = get_duckduckgo_evidence(query, max_results=max_snippets)
    for d in ddg:
        if d.get("snippet"):
            evidence.append(d)
        if len(evidence) >= max_snippets:
            break

    # final trimming
    return evidence[:max_snippets]
