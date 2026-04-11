"""
services/news_service.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Market Intelligence & Tech News Sync Service

This service keeps the AI Assistant informed about the latest tech trends,
coding news, and job market info.

Workflow:
  1. Fetch headlines from Hacker News, TechCrunch (RSS), and Dev.to.
  2. Normalize the data into a common schema.
  3. Deduplicate by URL.
  4. Embed using local Ollama (nomic-embed-text) and store in "tech_news" collection.

Note: Ingestion is 100% free (uses local Ollama).
─────────────────────────────────────────────────────────────────────────────
"""

import logging
import os
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime
from services.embedder import get_or_create_collection

logger = logging.getLogger("calibr.news")

# ─────────────────────────────────────────────────────────────────────────────
#  Sources Config
# ─────────────────────────────────────────────────────────────────────────────
SOURCES = {
    "hacker_news": "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=10",
    "tech_crunch": "https://techcrunch.com/feed/",
    "dev_to"     : "https://dev.to/api/articles?per_page=10&top=1",
}

def fetch_hacker_news() -> list[dict]:
    """Fetch latest stories from Hacker News via Algolia API."""
    try:
        response = httpx.get(SOURCES["hacker_news"], timeout=10)
        response.raise_for_status()
        hits = response.json().get("hits", [])
        
        results = []
        for hit in hits:
            results.append({
                "title": hit.get("title"),
                "url": hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}",
                "source": "Hacker News",
                "summary": f"Discussion on Hacker News about {hit.get('title')}",
                "timestamp": hit.get("created_at")
            })
        return results
    except Exception as e:
        logger.error(f"Hacker News fetch failed: {e}")
        return []

def fetch_tech_crunch() -> list[dict]:
    """Fetch latest tech news from TechCrunch RSS feed."""
    try:
        response = httpx.get(SOURCES["tech_crunch"], timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        items = root.findall(".//item")
        
        results = []
        for item in items[:10]:
            results.append({
                "title": item.find("title").text,
                "url": item.find("link").text,
                "source": "TechCrunch",
                "summary": item.find("description").text if item.find("description") is not None else "",
                "timestamp": item.find("pubDate").text
            })
        return results
    except Exception as e:
        logger.error(f"TechCrunch fetch failed: {e}")
        return []

def fetch_dev_to() -> list[dict]:
    """Fetch trending coding info from Dev.to."""
    try:
        response = httpx.get(SOURCES["dev_to"], timeout=10)
        response.raise_for_status()
        articles = response.json()
        
        results = []
        for art in articles:
            results.append({
                "title": art.get("title"),
                "url": art.get("url"),
                "source": "Dev.to",
                "summary": art.get("description"),
                "timestamp": art.get("published_at")
            })
        return results
    except Exception as e:
        logger.error(f"Dev.to fetch failed: {e}")
        return []

# ─────────────────────────────────────────────────────────────────────────────
#  Core Orchestrator
# ─────────────────────────────────────────────────────────────────────────────
def sync_market_intelligence() -> int:
    """
    Fetch news from all sources, embed, and store in tech_news collection.
    Returns: count of new items stored.
    """
    logger.info("Starting Market Intelligence Sync...")
    
    # 1. Gather all news
    all_news = []
    all_news.extend(fetch_hacker_news())
    all_news.extend(fetch_tech_crunch())
    all_news.extend(fetch_dev_to())
    
    if not all_news:
        logger.warning("No news fetched from any source.")
        return 0

    # 2. Deduplicate by URL
    seen_urls = set()
    unique_news = []
    for item in all_news:
        if item["url"] not in seen_urls:
            seen_urls.add(item["url"])
            unique_news.append(item)

    # 3. Embed and store in ChromaDB
    try:
        collection = get_or_create_collection("tech_news")
        
        ids = []
        docs = []
        metadatas = []
        
        for item in unique_news:
            # Create a rich text representation for embedding
            combined_text = f"{item['title']}. {item['summary']}".strip()
            
            # Generate a "safe" ID using URL hash or timestamp
            item_id = str(hash(item['url']))
            
            ids.append(item_id)
            docs.append(combined_text)
            metadatas.append({
                "source": item["source"],
                "url": item["url"],
                "title": item["title"],
                "timestamp": str(item["timestamp"])
            })

        if ids:
            collection.upsert(
                ids=ids,
                documents=docs,
                metadatas=metadatas
            )
            logger.info(f"✅ Successfully synced {len(ids)} Market Intelligence items.")
            return len(ids)

    except Exception as e:
        logger.error(f"Failed to store tech news in ChromaDB: {e}")
        return 0

    return 0
