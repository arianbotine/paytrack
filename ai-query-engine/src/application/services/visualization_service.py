class VisualizationService:
    def suggest(self, question: str, columns: list[str]) -> dict:
        lowered_question = question.lower()
        lowered_columns = [column.lower() for column in columns]

        if {'month', 'date'}.intersection(lowered_columns) or any(
            token in lowered_question for token in ['mes', 'evolucao', 'periodo', 'tendencia']
        ):
            x = self._first_match(lowered_columns, ['month', 'date', 'period'])
            y = self._first_numeric_candidate(lowered_columns, exclude={x})
            if x and y:
                return {'type': 'line', 'x': x, 'y': y}

        if any(token in lowered_question for token in ['top', 'ranking', 'maiores']):
            x = self._first_non_numeric_candidate(lowered_columns)
            y = self._first_numeric_candidate(lowered_columns, exclude={x})
            if x and y:
                return {'type': 'bar', 'x': x, 'y': y}

        return {'type': 'table'}

    @staticmethod
    def _first_match(columns: list[str], options: list[str]) -> str | None:
        for option in options:
            if option in columns:
                return option
        return None

    @staticmethod
    def _first_numeric_candidate(columns: list[str], exclude: set[str] | None = None) -> str | None:
        exclude = exclude or set()
        numeric_hints = ['amount', 'total', 'value', 'revenue', 'count', 'sum']
        for column in columns:
            if column in exclude:
                continue
            if any(hint in column for hint in numeric_hints):
                return column
        for column in columns:
            if column not in exclude:
                return column
        return None

    @staticmethod
    def _first_non_numeric_candidate(columns: list[str]) -> str | None:
        numeric_hints = ['amount', 'total', 'value', 'revenue', 'count', 'sum']
        for column in columns:
            if not any(hint in column for hint in numeric_hints):
                return column
        return columns[0] if columns else None
