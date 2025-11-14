import requests
import feedparser
from .settings import MAX_EVIDENCE_SNIPPETS


# ------------------------------------------------
# Wikipedia Evidence
# ------------------------------------------------
def get_wikipedia_evidence(query):
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "format": "json",
        "srsearch": query,
        "srlimit": 2,
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()

        results = data.get("query", {}).get("search", [])
        evidence = []

        for r in results:
            snippet = (
                r.get("snippet", "")
                .replace('<span class="searchmatch">', "")
                .replace("</span>", "")
            )
            evidence.append({
                "source": "Wikipedia",
                "title": r.get("title", ""),
                "snippet": snippet,
                "link": f"https://en.wikipedia.org/wiki/{r.get('title', '').replace(' ', '_')}"
            })

        return evidence

    except Exception:
        return []


# ------------------------------------------------
# Google News RSS Evidence
# ------------------------------------------------
def get_google_news_evidence(query):
    rss_url = f"https://news.google.com/rss/search?q={query.replace(' ', '+')}"

    try:
        feed = feedparser.parse(rss_url)
        evidence = []

        for entry in feed.entries[:10]:
            evidence.append({
                "source": "Google News",
                "title": entry.get("title", ""),
                "snippet": entry.get("summary", ""),
                "link": entry.get("link", "")
            })

        return evidence

    except Exception:
        return []


# ------------------------------------------------
# Collect Final Combined Evidence
# ------------------------------------------------
def collect_evidence(claim):
    evidence = []

    # Wikipedia first
    evidence.extend(get_wikipedia_evidence(claim))

    # Google News next if needed
    if len(evidence) < MAX_EVIDENCE_SNIPPETS:
        evidence.extend(get_google_news_evidence(claim))

    return evidence[:MAX_EVIDENCE_SNIPPETS]
