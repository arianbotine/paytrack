import re

from sqlglot import parse_one
from sqlglot.expressions import Select

from src.domain.exceptions.errors import UnsafeSQLError

BLOCKED_KEYWORDS = {'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE'}
BLOCKED_KEYWORDS_PATTERN = re.compile(
    r'\b(?:' + '|'.join(BLOCKED_KEYWORDS) + r')\b',
    re.IGNORECASE,
)


class SQLValidator:
    def __init__(self, query_limit: int):
        self.query_limit = query_limit

    def validate_and_rewrite(self, sql: str, organization_id: str) -> str:
        normalized = sql.strip().rstrip(';')

        # Attempt repair for common LLM SQL generation errors
        normalized = self._repair_common_sql_errors(normalized)

        # Apply case-insensitive normalization for name columns
        normalized = self._normalize_string_comparisons(normalized)

        normalized_without_strings = self._strip_string_literals(normalized)
        if BLOCKED_KEYWORDS_PATTERN.search(normalized_without_strings):
            raise UnsafeSQLError('Only SELECT statements are allowed')

        attempt_sql = normalized
        try:
            expression = parse_one(attempt_sql, read='postgres')
        except Exception:
            # Attempt to repair by closing unclosed parentheses (common in date filters)
            repaired_sql = self._repair_unclosed_parentheses(normalized)
            try:
                expression = parse_one(repaired_sql, read='postgres')
                attempt_sql = repaired_sql
            except Exception as exc:
                raise UnsafeSQLError(f'Invalid SQL generated: {exc}') from exc

        if not isinstance(expression, Select):
            raise UnsafeSQLError('Only top-level SELECT statements are allowed')

        self._validate_organization_filter(attempt_sql, organization_id)

        rendered_sql = expression.sql(dialect='postgres')
        if not expression.args.get('limit'):
            return f'{rendered_sql} LIMIT {self.query_limit}'
        return rendered_sql

    @staticmethod
    def _strip_string_literals(sql: str) -> str:
        # Prevent false positives from values like "updated" inside string literals.
        # Replace all quoted strings (single or double) with a placeholder to avoid
        # breaking on keywords inside function args like DATE_TRUNC('month', ...).
        result = re.sub(r"'(?:''|[^'])*'", "''", sql)
        result = re.sub(r'"(?:[^"])*"', '""', result)
        return result

    @staticmethod
    def _repair_common_sql_errors(sql: str) -> str:
        # Remove stray quote only for known malformed date tokens produced by LLM.
        # Example: DATE_TRUNC('month', CURRENT_DATE') -> DATE_TRUNC('month', CURRENT_DATE)
        sql = re.sub(
            r"\b(CURRENT_DATE|CURRENT_TIMESTAMP|NOW\(\))\s*'\s*\)",
            r"\1)",
            sql,
            flags=re.IGNORECASE,
        )

        # Remove stray quotes after operators like < or =
        sql = re.sub(r'([<>=])\s*\'(\s*DATE)', r'\1 \2', sql)

        return sql

    @staticmethod
    def _normalize_string_comparisons(sql: str) -> str:
        """
        Normalize string comparisons to case-insensitive for names in WHERE clauses.
        Example: name = 'Kael Botine' -> UPPER(name) = UPPER('Kael Botine')
        This prevents mismatches when DB has 'KAEL BOTINE' but LLM generates 'Kael Botine'.
        """
        def replace_string_compare(match):
            col_name = match.group(1).strip()
            operator = match.group(2).strip()
            string_val = match.group(3)

            # Only apply to name columns and = or LIKE operators
            if 'name' in col_name.lower() and operator.upper() in ('=', 'LIKE', 'ILIKE'):
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

    @staticmethod
    def _repair_unclosed_parentheses(sql: str) -> str:
        # Count open and close parentheses (ignoring those inside string literals).
        # If more open than close, append closing parens to fix SQL generation errors.
        temp = re.sub(r"'(?:''|[^'])*'", '', sql)
        temp = re.sub(r'"(?:[^"])*"', '', temp)

        open_count = temp.count('(')
        close_count = temp.count(')')

        if open_count > close_count:
            missing = open_count - close_count
            return sql + ')' * missing

        return sql

    def _validate_organization_filter(self, sql: str, organization_id: str) -> None:
        escaped_org = re.escape(organization_id)
        pattern = re.compile(
            rf"organization_id\s*=\s*(?:'{escaped_org}'|{escaped_org})",
            re.IGNORECASE,
        )
        if not pattern.search(sql):
            raise UnsafeSQLError('Query must include organization_id filter')
