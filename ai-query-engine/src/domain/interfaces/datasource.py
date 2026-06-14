from abc import ABC, abstractmethod


class DataSource(ABC):
    @abstractmethod
    def execute_query(self, sql: str) -> tuple[list[str], list[dict]]:
        raise NotImplementedError

    @abstractmethod
    def get_schema(self) -> dict[str, list[str]]:
        raise NotImplementedError

    @abstractmethod
    def get_sample_data(self, organization_id: str) -> dict[str, list[dict]]:
        """Get sample data from key tables for LLM context (customers, vendors, etc.)."""
        raise NotImplementedError
