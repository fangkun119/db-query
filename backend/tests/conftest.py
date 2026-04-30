import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.db.sqlite import Base


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def async_session():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def sample_connection(async_session: AsyncSession):
    from app.db.sqlite import DatabaseConnection
    from datetime import datetime, timezone

    conn = DatabaseConnection(
        name="test-db",
        url="postgresql://user:pass@localhost:5432/testdb",
        db_type="postgresql",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(conn)
    await async_session.commit()
    await async_session.refresh(conn)
    return conn


@pytest_asyncio.fixture
async def sample_connection_with_metadata(async_session: AsyncSession):
    import json
    from app.db.sqlite import DatabaseConnection
    from datetime import datetime, timezone

    metadata = [
        {
            "schema_name": "public",
            "table_name": "users",
            "table_type": "BASE TABLE",
            "columns": [
                {"name": "id", "data_type": "integer", "is_nullable": False, "default_value": None, "ordinal_position": 1},
                {"name": "name", "data_type": "varchar", "is_nullable": False, "default_value": None, "ordinal_position": 2},
            ],
        },
        {
            "schema_name": "public",
            "table_name": "user_view",
            "table_type": "VIEW",
            "columns": [
                {"name": "id", "data_type": "integer", "is_nullable": True, "default_value": None, "ordinal_position": 1},
            ],
        },
    ]

    conn = DatabaseConnection(
        name="test-db-meta",
        url="postgresql://user:pass@localhost:5432/testdb",
        db_type="postgresql",
        status="active",
        metadata_json=json.dumps(metadata),
        created_at=datetime.now(timezone.utc),
        last_refreshed_at=datetime.now(timezone.utc),
    )
    async_session.add(conn)
    await async_session.commit()
    await async_session.refresh(conn)
    return conn
