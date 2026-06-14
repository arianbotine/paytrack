from __future__ import annotations

from typing import Any

import pandas as pd
from vanna.base.base import VannaBase

from src.domain.interfaces.llm_provider import LLMProvider
from src.domain.interfaces.training_provider import TrainingProvider


class VannaOSSModel(VannaBase):
    def __init__(
        self,
        llm_provider: LLMProvider,
        training_provider: TrainingProvider,
    ):
        super().__init__({'dialect': 'PostgreSQL'})
        self.llm_provider = llm_provider
        self.training_provider = training_provider

    def generate_embedding(self, data: str, **kwargs) -> list[float]:
        del kwargs
        # Deterministic lightweight embedding for local ranking fallback.
        vector = [0.0] * 16
        if not data:
            return vector

        for token in data.lower().split():
            vector[hash(token) % len(vector)] += 1.0

        magnitude = sum(value * value for value in vector) ** 0.5
        if magnitude == 0:
            return vector

        return [value / magnitude for value in vector]

    def get_similar_question_sql(self, question: str, **kwargs) -> list:
        organization_id = kwargs.get('organization_id', '')
        limit = int(kwargs.get('retrieval_limit', 5))
        return self.training_provider.get_similar_question_sql(
            question=question,
            organization_id=organization_id,
            limit=limit,
        )

    def get_related_ddl(self, question: str, **kwargs) -> list:
        organization_id = kwargs.get('organization_id', '')
        limit = int(kwargs.get('retrieval_limit', 5))
        return self.training_provider.get_related_ddl(
            question=question,
            organization_id=organization_id,
            limit=limit,
        )

    def get_related_documentation(self, question: str, **kwargs) -> list:
        organization_id = kwargs.get('organization_id', '')
        limit = int(kwargs.get('retrieval_limit', 5))
        docs = self.training_provider.get_related_documentation(
            question=question,
            organization_id=organization_id,
            limit=limit,
        )

        request_context = kwargs.get('context', '')
        if isinstance(request_context, str) and request_context.strip():
            docs = [request_context, *docs]

        return docs

    def add_question_sql(self, question: str, sql: str, **kwargs) -> str:
        organization_id = kwargs.get('organization_id', '')
        return self.training_provider.add_question_sql(
            question=question,
            sql=sql,
            organization_id=organization_id,
        )

    def add_ddl(self, ddl: str, **kwargs) -> str:
        organization_id = kwargs.get('organization_id', '')
        return self.training_provider.add_ddl(
            ddl=ddl,
            organization_id=organization_id,
        )

    def add_documentation(self, documentation: str, **kwargs) -> str:
        organization_id = kwargs.get('organization_id', '')
        return self.training_provider.add_documentation(
            documentation=documentation,
            organization_id=organization_id,
        )

    def get_training_data(self, **kwargs) -> pd.DataFrame:
        organization_id = kwargs.get('organization_id', '')
        rows = self.training_provider.list_training_data(organization_id=organization_id)
        return pd.DataFrame(rows)

    def remove_training_data(self, id: str, **kwargs) -> bool:
        organization_id = kwargs.get('organization_id', '')
        return self.training_provider.remove_training_data(
            id=id,
            organization_id=organization_id,
        )

    @staticmethod
    def system_message(message: str) -> dict[str, str]:
        return {'role': 'system', 'content': message}

    @staticmethod
    def user_message(message: str) -> dict[str, str]:
        return {'role': 'user', 'content': message}

    @staticmethod
    def assistant_message(message: str) -> dict[str, str]:
        return {'role': 'assistant', 'content': message}

    def submit_prompt(self, prompt: Any, **kwargs) -> str:
        del kwargs

        if isinstance(prompt, list):
            sections: list[str] = []
            for message in prompt:
                if isinstance(message, dict):
                    role = str(message.get('role', 'user')).upper()
                    content = str(message.get('content', ''))
                    sections.append(f'{role}:\n{content}')
                else:
                    sections.append(str(message))
            final_prompt = '\n\n'.join(sections)
        else:
            final_prompt = str(prompt)

        return self.llm_provider.generate(final_prompt)
