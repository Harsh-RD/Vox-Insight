from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.workspaces import router as workspaces_router
from app.api.v1.datasets import router as datasets_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.search import router as search_router, dataset_router as search_dataset_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.analytics import router as analytics_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(workspaces_router)
api_v1_router.include_router(datasets_router)
api_v1_router.include_router(feedback_router)
api_v1_router.include_router(search_dataset_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(conversations_router)
api_v1_router.include_router(analytics_router)
