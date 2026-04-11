"""
routers/news.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Market Intelligence Router

Endpoints for managing tech news and industry trends.
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from services.news_service import sync_market_intelligence
from utils.auth import get_current_user_id

router = APIRouter()

@router.post("/refresh")
async def refresh_market_intelligence(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """
    Manually trigger a Market Intelligence sync.
    Runs in the background to avoid blocking the user.
    """
    try:
        # We run it as a background task because scraping can take 10-20 seconds
        background_tasks.add_task(sync_market_intelligence)
        return {
            "status": "success",
            "message": "Market Intelligence sync started in background."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_sync_status():
    """
    Get the status of the tech_news collection.
    """
    from services.embedder import get_or_create_collection
    try:
        collection = get_or_create_collection("tech_news")
        count = collection.count()
        return {
            "collection": "tech_news",
            "document_count": count,
            "status": "active" if count > 0 else "empty"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
