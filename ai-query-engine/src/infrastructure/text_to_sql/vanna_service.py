import re

from src.domain.exceptions.errors import ExternalProviderError
from src.domain.interfaces.llm_provider import LLMProvider
from src.domain.interfaces.text_to_sql import SQLGenerationResult, TextToSQLService


class VannaTextToSQLService(TextToSQLService):
    def __init__(self, llm_provider: LLMProvider):
        self.llm_provider = llm_provider

    def generate_sql(
        self,
        question: str,
        context: str,
        organization_id: str,
    ) -> SQLGenerationResult:
        prompt = (
            'Voce gera apenas SQL PostgreSQL valido, sem markdown e sem explicacoes.\n'
            'Regras obrigatorias:\n'
            '1) Apenas SELECT\n'
            f'2) Sempre incluir filtro organization_id = \"{organization_id}\"\n'
            '3) Nunca usar comandos de escrita\n'
            '4) Preferir nomes de colunas/tabelas presentes no contexto\n\n'
            f'Contexto:\n{context}\n\n'
            f'Pergunta:\n{question}\n\n'
            'Retorne somente SQL.'
        )

        try:
            raw_output = self.llm_provider.generate(prompt)
            sanitized_sql = self._sanitize_sql(raw_output)
            if sanitized_sql and self._contains_org_filter(sanitized_sql):
                return SQLGenerationResult(
                    sql=sanitized_sql,
                    source='vanna_generated',
                )
        except ExternalProviderError:
            pass

        return SQLGenerationResult(
            sql='',
            source='generation_failed',
        )

    @staticmethod
    def _contains_org_filter(sql: str) -> bool:
        return bool(
            re.search(r'organization_id\s*=\s*(?:\'[^\']+\'|[^\s)]+)', sql, re.IGNORECASE)
        )

    @staticmethod
    def _sanitize_sql(raw_output: str) -> str:
        if not raw_output:
            return ''

        content = raw_output.strip()
        code_block_match = re.search(r'```(?:sql)?\s*(.*?)```', content, re.IGNORECASE | re.DOTALL)
        if code_block_match:
            content = code_block_match.group(1).strip()

        select_start = re.search(r'\bSELECT\b', content, re.IGNORECASE)
        if not select_start:
            return ''

        content = content[select_start.start():]
        content = content.strip().rstrip(';')
        return content
