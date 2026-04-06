import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from . import config  # noqa: F401 — .env'i ilk import sırasında yükler
from .database import engine, Base
from .routers import users, chat

logger = logging.getLogger(__name__)


def _run_migrations():
    """Create tables and apply any missing column additions."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        # Add memory column to users if it doesn't exist yet
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)"))]
        if "memory" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN memory TEXT"))
            conn.commit()
            logger.info("Migration: users.memory sütunu eklendi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_migrations()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="PsiKoç API",
    description="Türkçe yapay zeka destekli duygusal destek asistanı",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(chat.router)


@app.get("/")
def root():
    return {"message": "PsiKoç API'sine hoş geldiniz", "status": "çalışıyor"}


@app.get("/health")
def health():
    return {"status": "ok"}
