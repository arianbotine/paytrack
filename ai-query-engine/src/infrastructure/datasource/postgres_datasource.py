from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from src.domain.interfaces.datasource import DataSource
from src.infrastructure.config.settings import Settings


class PostgresDataSource(DataSource):
    def __init__(self, settings: Settings):
        self.settings = settings
        self.engine: Engine = create_engine(
            settings.sqlalchemy_database_url,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={'connect_timeout': settings.query_timeout_seconds},
        )

    def execute_query(self, sql: str) -> tuple[list[str], list[dict]]:
        timeout_sql = text(
            f'SET LOCAL statement_timeout = {self.settings.query_timeout_seconds * 1000}'
        )
        query_sql = text(sql)

        with self.engine.begin() as connection:
            connection.execute(timeout_sql)
            result = connection.execute(query_sql)
            rows = [dict(row._mapping) for row in result.fetchall()]
            columns = list(result.keys())
        return columns, rows

    def get_schema(self) -> dict[str, list[str]]:
        schema_sql = text(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
            """
        )
        schema: dict[str, list[str]] = {}
        with self.engine.begin() as connection:
            rows = connection.execute(schema_sql).fetchall()
            for row in rows:
                table_name = row[0]
                column_name = row[1]
                schema.setdefault(table_name, []).append(column_name)
        return schema

    def get_sample_data(self, organization_id: str) -> dict[str, list[dict]]:
        """Retrieve sample data from key entity tables to improve LLM context."""
        samples: dict[str, list[dict]] = {}

        # Sample customers
        try:
            customers_sql = text(
                """
                SELECT id, name FROM customers
                WHERE organization_id = :org_id
                LIMIT 10 OFFSET 0
                """
            )
            with self.engine.begin() as connection:
                rows = connection.execute(customers_sql, {'org_id': organization_id}).fetchall()
                samples['customers'] = [{'id': row[0], 'name': row[1]} for row in rows]
        except Exception:
            samples['customers'] = []

        # Sample vendors
        try:
            vendors_sql = text(
                """
                SELECT id, name FROM vendors
                WHERE organization_id = :org_id
                LIMIT 10 OFFSET 0
                """
            )
            with self.engine.begin() as connection:
                rows = connection.execute(vendors_sql, {'org_id': organization_id}).fetchall()
                samples['vendors'] = [{'id': row[0], 'name': row[1]} for row in rows]
        except Exception:
            samples['vendors'] = []

        return samples
