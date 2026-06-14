from pathlib import Path

import yaml

from src.domain.interfaces.datasource import DataSource


class ContextBuilder:
    def __init__(self, data_source: DataSource, glossary_path: Path, examples_path: Path):
        self.data_source = data_source
        self.glossary = self._load_yaml(glossary_path)
        self.examples = self._load_yaml(examples_path)

    def build(self, organization_id: str = '') -> str:
        schema = self.data_source.get_schema()
        schema_lines: list[str] = []
        for table, columns in schema.items():
            schema_lines.append(f'- {table}: {", ".join(columns)}')

        # Retrieve sample entity data to help LLM match real names (e.g., "KAEL BOTINE" not "Kael Botine")
        sample_data = {}
        if organization_id:
            sample_data = self.data_source.get_sample_data(organization_id)

        sample_data_lines: list[str] = []
        if sample_data.get('customers'):
            sample_data_lines.append('- **Sample Customers**:')
            for cust in sample_data['customers'][:5]:
                sample_data_lines.append(f'  - {cust["name"]} (id: {cust["id"]})')

        if sample_data.get('vendors'):
            sample_data_lines.append('- **Sample Vendors**:')
            for vendor in sample_data['vendors'][:5]:
                sample_data_lines.append(f'  - {vendor["name"]} (id: {vendor["id"]})')

        return '\n'.join(
            [
                '### Database Schema',
                *schema_lines,
                '',
                '### Business Glossary',
                yaml.safe_dump(self.glossary, sort_keys=False, allow_unicode=False),
                '',
                '### SQL Examples',
                yaml.safe_dump(self.examples, sort_keys=False, allow_unicode=False),
                '',
                '### Sample Entity Data',
                '\n'.join(sample_data_lines) if sample_data_lines else 'No sample data available',
            ]
        )

    @staticmethod
    def _load_yaml(path: Path) -> dict:
        if not path.exists():
            return {}
        content = yaml.safe_load(path.read_text(encoding='utf-8'))
        return content if isinstance(content, dict) else {}
