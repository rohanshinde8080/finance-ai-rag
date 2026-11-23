from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.router import api_router
from app.db.connection import init_db_pool, close_db_pool, check_db_health
from app.db.migrate import run_migrations
from app.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown procedures."""
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode...")
    
    try:
        # 1. Run automated SQL schema migrations and admin seeding first (creates vector extension)
        logger.info("Executing database schema migrations...")
        run_migrations()
        logger.info("Database migrations successfully executed.")

        # 2. Initialize DB connection pool with pgvector registered
        init_db_pool()
        logger.info("Database pool established.")

        # 3. Initialize or warm up the FAISS in-memory index
        logger.info("Synchronizing FAISS vector index...")
        from app.services.faiss_service import faiss_manager
        faiss_manager.load_or_rebuild_index()
        logger.info(f"FAISS vector index initialized with {faiss_manager.get_total_vectors()} vectors.")
    except Exception as e:
        logger.error(f"Startup database initialization error: {e}")
        logger.warning("Application starting with limited DB connectivity. Verify PostgreSQL connection.")

    yield

    # Shutdown: Close database connection pool
    logger.info("Shutting down FinanceAI backend...")
    close_db_pool()
    logger.info("Cleanup completed.")

# Initialize FastAPI application
app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="Domain-Specific Financial Assistant using Retrieval-Augmented Generation (RAG)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please contact the administrator.",
            "error_type": type(exc).__name__
        }
    )

# Root & Health Endpoints
@app.api_route("/", methods=["GET", "HEAD"], tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs"
    }

@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
def health():
    db_alive = check_db_health()
    return {
        "status": "healthy" if db_alive else "degraded",
        "database_connected": db_alive,
        "environment": settings.APP_ENV
    }

# Mount REST API Routers
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

