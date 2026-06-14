from abc import ABC, abstractmethod


class TrainingProvider(ABC):
    @abstractmethod
    def add_question_sql(self, question: str, sql: str, organization_id: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def add_ddl(self, ddl: str, organization_id: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def add_documentation(self, documentation: str, organization_id: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def get_similar_question_sql(
        self,
        question: str,
        organization_id: str,
        limit: int,
    ) -> list[dict[str, str]]:
        raise NotImplementedError

    @abstractmethod
    def get_related_ddl(
        self,
        question: str,
        organization_id: str,
        limit: int,
    ) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    def get_related_documentation(
        self,
        question: str,
        organization_id: str,
        limit: int,
    ) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    def list_training_data(self, organization_id: str) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def remove_training_data(self, id: str, organization_id: str) -> bool:
        raise NotImplementedError
