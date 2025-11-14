import requests
import feedparser
from .settings import MAX_EVIDENCE_SNIPPETS


# ------------------------------------------------
#  Wikipedia Evidence
# ------------------------------------------------
def get_wikipedia_evidence(query):
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "format": "json",
        "srsearch": query,
        "srlimit": 2,       # max 2 wiki entries
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()

        results = data.get("query", {}).get("search", [])
        evidence = []

        for r in results:
            snippet = r.get("snippet", "").replace("<span class=\"searchmatch\">", "").replace("</span>", "")
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
#  Google News RSS Evidence
# ------------------------------------------------
def get_google_news_evidence(query):
    rss_url = f"https://news.google.com/rss/search?q={query.replace(' ', '+')}"
    
    try:
        feed = feedparser.parse(rss_url)
        evidence = []

        for entry in feed.entries[:10]:  # get top 10 news articles
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
# Collect final evidence for fact-checking
# ------------------------------------------------
def collect_evidence(claim):
    evidence = []

    # 1. Wikipedia evidence
    wiki_e = get_wikipedia_evidence(claim)
    evidence.extend(wiki_e)

    # 2. Google News evidence
    if len(evidence) < MAX_EVIDENCE_SNIPPETS:
        news_e = get_google_news_evidence(claim)
        evidence.extend(news_e)

    # trim to max
    return evidence[:MAX_EVIDENCE_SNIPPETS]
