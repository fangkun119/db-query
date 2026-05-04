from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db.sqlite import init_db
from .api.v1 import databases
from .config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    # Shutdown: dispose engines if needed


app = FastAPI(
    title="DB Query API",
    lifespan=lifespan
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origins],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(databases.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "DB Query API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
