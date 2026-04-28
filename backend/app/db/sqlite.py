from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Text
from datetime import datetime, timezone
from pathlib import Path
import os


class Base(DeclarativeBase):
    pass


class DatabaseConnection(Base):
    __tablename__ = "database_connections"

    name: Mapped[str] = mapped_column(String(100), primary_key=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    db_type: Mapped[str] = mapped_column(String(50), nullable=False, default="postgresql")
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    last_refreshed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


_db_path: str | None = None
_engine: any = None
_async_session_maker: any = None


def get_db_path(expand_path: str = "~/.db_query/db_query.db") -> str:
    return os.path.expanduser(expand_path)


def get_engine():
    global _engine, _db_path
    if _engine is None:
        _db_path = get_db_path()
        Path(_db_path).parent.mkdir(parents=True, exist_ok=True)
        db_url = f"sqlite+aiosqlite:///{_db_path}"
        _engine = create_async_engine(db_url)
    return _engine


def get_async_session_maker():
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(
            get_engine(), class_=AsyncSession, expire_on_commit=False
        )
    return _async_session_maker


async def init_db():
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
