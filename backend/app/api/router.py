from fastapi import APIRouter
from app.api.v1 import auth, documents, chat, feedback, admin

api_router = APIRouter(prefix="/api/v1")

# Mount v1 routers
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(feedback.router)
api_router.include_router(admin.router)
