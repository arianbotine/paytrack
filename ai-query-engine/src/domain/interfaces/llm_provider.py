from abc import ABC, abstractmethod


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def generate_insights(
        self,
        question: str,
        sql: str,
        result: list[dict],
        response_mode: str = 'basic',
    ) -> str:
        raise NotImplementedError
