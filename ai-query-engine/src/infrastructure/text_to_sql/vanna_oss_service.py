import re
import logging

from src.domain.exceptions.errors import ExternalProviderError
from src.domain.interfaces.llm_provider import LLMProvider
from src.domain.interfaces.text_to_sql import SQLGenerationResult, TextToSQLService
from src.domain.interfaces.training_provider import TrainingProvider
from src.infrastructure.text_to_sql.vanna_oss_model import VannaOSSModel


logger = logging.getLogger(__name__)


class VannaOSSTextToSQLService(TextToSQLService):
    def __init__(
        self,
        llm_provider: LLMProvider,
        training_provider: TrainingProvider,
        retrieval_limit: int,
    ):
        self.llm_provider = llm_provider
        self.training_provider = training_provider
        self.retrieval_limit = retrieval_limit

    def generate_sql(
        self,
        question: str,
        context: str,
        organization_id: str,
    ) -> SQLGenerationResult:
        trained_result = self._get_direct_trained_sql(question, organization_id)
        if trained_result is not None:
            return trained_result

        model = VannaOSSModel(
            llm_provider=self.llm_provider,
            training_provider=self.training_provider,
        )
        model.config['initial_prompt'] = self._build_initial_prompt(organization_id)
        self.training_provider.add_documentation(
            documentation=context,
            organization_id=organization_id,
        )

        try:
            raw_sql = model.generate_sql(
                question=question,
                organization_id=organization_id,
                context=context,
                retrieval_limit=self.retrieval_limit,
            )

            sanitized_sql = self._sanitize_sql(raw_sql)
            if sanitized_sql and self._contains_org_filter(sanitized_sql):
                return SQLGenerationResult(
                    sql=sanitized_sql,
                    source='vanna_generated',
                )
            logger.warning(
                'Generated SQL is invalid and request will be aborted | reason=invalid_generated_sql | raw_sql=%s | sanitized_sql=%s',
                raw_sql,
                sanitized_sql,
            )
        except ExternalProviderError:
            logger.warning('SQL generation failed and request will be aborted | reason=provider_error')

        return SQLGenerationResult(
            sql='',
            source='generation_failed',
        )

    def _get_direct_trained_sql(
        self,
        question: str,
        organization_id: str,
    ) -> SQLGenerationResult | None:
        candidates = self.training_provider.get_similar_question_sql(
            question=question,
            organization_id=organization_id,
            limit=max(self.retrieval_limit, 1),
        )
        if not candidates:
            return None

        normalized_question = self._normalize_question(question)
        for candidate in candidates:
            candidate_question = self._normalize_question(candidate.get('question', ''))
            if not candidate_question:
                continue

            if candidate_question == normalized_question:
                result = self._build_trained_result(candidate.get('sql', ''), 'trained_exact')
                if result is not None:
                    return result

            if normalized_question in candidate_question or candidate_question in normalized_question:
                result = self._build_trained_result(candidate.get('sql', ''), 'trained_similar')
                if result is not None:
                    return result

        return None

    def _build_trained_result(
        self,
        candidate_sql: str,
        source: str,
    ) -> SQLGenerationResult | None:
        sanitized_sql = self._sanitize_sql(candidate_sql)
        if not sanitized_sql or not self._contains_org_filter(sanitized_sql):
            return None

        return SQLGenerationResult(
            sql=sanitized_sql,
            source=source,
        )

    @staticmethod
    def _normalize_question(text: str) -> str:
        cleaned = re.sub(r'\s+', ' ', text.strip().lower())
        cleaned = re.sub(r'[^a-z0-9\s]', '', cleaned)
        return cleaned

    def train_question_sql(self, organization_id: str, question: str, sql: str) -> str:
        return self.training_provider.add_question_sql(
            question=question,
            sql=sql,
            organization_id=organization_id,
        )

    def train_ddl(self, organization_id: str, ddl: str) -> str:
        return self.training_provider.add_ddl(ddl=ddl, organization_id=organization_id)

    def train_documentation(self, organization_id: str, documentation: str) -> str:
        return self.training_provider.add_documentation(
            documentation=documentation,
            organization_id=organization_id,
        )

    @staticmethod
    def _build_initial_prompt(organization_id: str) -> str:
        return (
            'Voce gera apenas SQL PostgreSQL valido, sem markdown e sem explicacoes. '
            'Regras obrigatorias: '
            '1) Apenas SELECT. '
            f'2) Sempre incluir filtro organization_id = "{organization_id}". '
            '3) Nunca usar comandos de escrita. '
            '4) Preferir nomes de colunas e tabelas presentes no contexto e nos exemplos treinados.'
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

        sql = content.strip().rstrip(';')
        # Normalize string comparisons for case-insensitive matching on names
        sql = VannaOSSTextToSQLService._normalize_string_comparisons(sql)
        return sql

    @staticmethod
    def _normalize_string_comparisons(sql: str) -> str:
        """
        Normalize string comparisons to case-insensitive for names in WHERE clauses.
        Example: name = 'Kael Botine' -> UPPER(name) = UPPER('Kael Botine')
        This prevents mismatches when DB has 'KAEL BOTINE' but LLM generates 'Kael Botine'.
        """
        # Match comparisons with string literals on name, vendor_name, customer_name columns
        # Pattern: (column_name) (operator) ('string_value')
        def replace_string_compare(match):
            col_name = match.group(1).strip()
            operator = match.group(2).strip()
            string_val = match.group(3)

            # Only apply to name columns and = or LIKE operators
            if ('name' in col_name.lower() and
                operator.upper() in ('=', 'LIKE', 'ILIKE')):
                # Convert to case-insensitive: UPPER(col) = UPPER('value')
                return f"UPPER({col_name}) {operator} UPPER({string_val})"
            return match.group(0)

        # Match any column = or LIKE 'string' pattern
        sql = re.sub(
            r'(\w+(?:\.\w+)?)\s+(=|LIKE|ILIKE)\s+(' + r"'[^']*'" + r')',
            replace_string_compare,
            sql,
            flags=re.IGNORECASE
        )
        return sql
