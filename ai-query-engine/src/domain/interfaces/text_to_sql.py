from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class SQLGenerationResult:
    sql: str
    source: str


class TextToSQLService(ABC):
    @abstractmethod
    def generate_sql(
        self,
        question: str,
        context: str,
        organization_id: str,
    ) -> SQLGenerationResult:
        raise NotImplementedError
