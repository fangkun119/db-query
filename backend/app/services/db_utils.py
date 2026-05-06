"""Shared database utilities."""

from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import NullPool


@asynccontextmanager
async def ephemeral_engine(url: str) -> AsyncEngine:
    """Create a transient async engine that is disposed after use.

    Uses NullPool to avoid connection pooling - each query gets its own
    connection which is released immediately after use.
    """
    engine = create_async_engine(url, poolclass=NullPool)
    try:
        yield engine
    finally:
        await engine.dispose()
