from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from typing import Optional
import json
from datetime import datetime, timezone

from app.db.sqlite import DatabaseConnection, get_async_session_maker
from app.models.metadata import TableMetadata, ColumnMetadata, TableMetadataResponse, ColumnMetadataResponse
from app.models.database import DatabaseDetailResponse
from app.services.connection import ConnectionService


class MetadataService:
    """Service for fetching and managing database metadata."""

    # System schemas to exclude
    EXCLUDED_SCHEMAS = {"pg_catalog", "information_schema"}

    @staticmethod
    async def fetch_metadata(url: str) -> tuple[bool, str, Optional[list[TableMetadata]]]:
        """Fetch metadata from database.

        Queries information_schema for tables and columns,
        filters out system schemas.

        Returns:
            tuple: (success, error_message, metadata_list)
        """
        async_url = ConnectionService.get_connection_url(url)
        engine = None
        try:
            engine = create_async_engine(async_url, poolclass=NullPool)
            async with engine.connect() as conn:
                # Query for tables and views
                query = text("""
                    SELECT
                        t.table_schema,
                        t.table_name,
                        t.table_type,
                        c.column_name,
                        c.data_type,
                        c.is_nullable,
                        c.column_default,
                        c.ordinal_position
                    FROM information_schema.tables t
                    LEFT JOIN information_schema.columns c
                        ON t.table_schema = c.table_schema
                        AND t.table_name = c.table_name
                    WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                    ORDER BY t.table_schema, t.table_name, c.ordinal_position
                """)

                result = await conn.execute(query)
                rows = result.fetchall()

                # Group by table
                tables_dict = {}
                for row in rows:
                    schema_name = row[0]
                    table_name = row[1]
                    table_type = row[2]

                    key = f"{schema_name}.{table_name}"
                    if key not in tables_dict:
                        tables_dict[key] = {
                            "schema_name": schema_name,
                            "table_name": table_name,
                            "table_type": table_type,
                            "columns": []
                        }

                    # Add column if present (views might have no columns in some DBs)
                    if row[3]:  # column_name
                        tables_dict[key]["columns"].append({
                            "name": row[3],
                            "data_type": row[4],
                            "is_nullable": row[5] == "YES",
                            "default_value": row[6],
                            "ordinal_position": row[7]
                        })

                # Convert to TableMetadata models
                metadata_list = []
                for table_data in tables_dict.values():
                    columns = [
                        ColumnMetadata(**col) for col in table_data["columns"]
                    ]
                    metadata_list.append(TableMetadata(
                        schema_name=table_data["schema_name"],
                        table_name=table_data["table_name"],
                        table_type=table_data["table_type"],
                        columns=columns
                    ))

                return True, "", metadata_list

        except Exception as e:
            return False, f"获取元数据失败：{str(e)}", None
        finally:
            if engine:
                await engine.dispose()

    @staticmethod
    def _serialize_metadata(metadata_list: list[TableMetadata]) -> str:
        """Serialize metadata to JSON for storage."""
        data = []
        for table in metadata_list:
            table_data = {
                "schema_name": table.schema_name,
                "table_name": table.table_name,
                "table_type": table.table_type,
                "columns": [
                    {
                        "name": col.name,
                        "data_type": col.data_type,
                        "is_nullable": col.is_nullable,
                        "default_value": col.default_value,
                        "ordinal_position": col.ordinal_position
                    }
                    for col in table.columns
                ]
            }
            data.append(table_data)
        return json.dumps(data, ensure_ascii=False)

    @staticmethod
    def _parse_metadata(metadata_json: str) -> list[TableMetadata]:
        """Parse metadata from JSON storage."""
        if not metadata_json:
            return []

        data = json.loads(metadata_json)
        metadata_list = []
        for table_data in data:
            columns = [
                ColumnMetadata(
                    name=col["name"],
                    data_type=col["data_type"],
                    is_nullable=col["is_nullable"],
                    default_value=col.get("default_value"),
                    ordinal_position=col["ordinal_position"]
                )
                for col in table_data["columns"]
            ]
            metadata_list.append(TableMetadata(
                schema_name=table_data["schema_name"],
                table_name=table_data["table_name"],
                table_type=table_data["table_type"],
                columns=columns
            ))
        return metadata_list

    @staticmethod
    async def get_metadata_with_refresh(name: str, force_refresh: bool = False) -> tuple[bool, str, Optional[DatabaseDetailResponse]]:
        """Get database metadata, optionally forcing a refresh.

        Returns:
            tuple: (success, error_message, response)
        """
        session_maker = get_async_session_maker()
        async with session_maker() as session:
            from sqlalchemy import select
            result = await session.execute(
                select(DatabaseConnection).where(DatabaseConnection.name == name)
            )
            conn = result.scalar_one_or_none()

            if not conn:
                return False, f"连接 '{name}' 不存在", None

            metadata_list = None
            should_fetch = force_refresh or not conn.metadata_json

            if should_fetch:
                # Fetch fresh metadata
                success, error_msg, metadata_list = await MetadataService.fetch_metadata(conn.url)
                if not success:
                    # Update connection status to error
                    conn.status = "error"
                    await session.commit()
                    return False, error_msg, None

                # Store metadata
                conn.metadata_json = MetadataService._serialize_metadata(metadata_list)
                conn.last_refreshed_at = datetime.now(timezone.utc)
                conn.status = "active"
                await session.commit()
            else:
                # Use cached metadata
                metadata_list = MetadataService._parse_metadata(conn.metadata_json)

            # Convert to response format (as dicts)
            tables = [
                {
                    "schema_name": table.schema_name,
                    "table_name": table.table_name,
                    "table_type": table.table_type,
                    "columns": [
                        {
                            "name": col.name,
                            "data_type": col.data_type,
                            "is_nullable": col.is_nullable,
                            "default_value": col.default_value
                        }
                        for col in table.columns
                    ]
                }
                for table in metadata_list
            ]

            response = DatabaseDetailResponse(
                name=conn.name,
                db_type=conn.db_type,
                status=conn.status,
                tables=tables,
                created_at=conn.created_at,
                last_refreshed_at=conn.last_refreshed_at
            )

            return True, "", response
