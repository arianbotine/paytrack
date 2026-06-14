from src.domain.exceptions.errors import ExternalProviderError
from src.domain.interfaces.llm_provider import LLMProvider


class InsightService:
    def __init__(self, llm_provider: LLMProvider):
        self.llm_provider = llm_provider

    def generate(
        self,
        question: str,
        sql: str,
        result: list[dict],
        response_mode: str = 'basic',
    ) -> tuple[str, bool]:
        if not result:
            return 'Nao foram encontrados dados para a pergunta informada.', False

        try:
            return (
                self.llm_provider.generate_insights(
                    question=question,
                    sql=sql,
                    result=result,
                    response_mode=response_mode,
                ),
                False,
            )
        except ExternalProviderError as error:
            details = str(error).lower()
            if '429' in details or 'rate' in details or 'quota' in details:
                reason = 'O provedor de IA atingiu limite de uso no momento'
            elif 'timeout' in details:
                reason = 'A chamada ao provedor de IA expirou'
            else:
                reason = 'Nao foi possivel gerar a explicacao automatica'

            local_summary = self._build_local_summary(result)
            return (
                (
                    'Consulta executada com sucesso. '
                    f'{reason}.\n\n'
                    f'{local_summary}'
                ),
                True,
            )

    @staticmethod
    def _build_local_summary(result: list[dict]) -> str:
        row_count = len(result)
        first_row = result[0] if result else {}

        numeric_items: list[tuple[str, float]] = []
        for key, value in first_row.items():
            if isinstance(value, bool):
                continue
            if isinstance(value, (int, float)):
                numeric_items.append((str(key), float(value)))

        parts = [f'Resultado retornou {row_count} registro(s).']
        if numeric_items:
            parts.append('Valores de referencia da primeira linha:')
            parts.extend(
                [f'- {column}: {value:,.2f}' for column, value in numeric_items[:3]]
            )

        return '\n'.join(parts)
