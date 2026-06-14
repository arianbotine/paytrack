import fcntl
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4

from src.domain.interfaces.training_provider import TrainingProvider


class VannaLocalTrainingProvider(TrainingProvider):
    def __init__(self, storage_path: Path, max_question_sql_per_org: int = 300):
        self.storage_path = storage_path
        self.max_question_sql_per_org = max(max_question_sql_per_org, 1)
        self.lock_path = self.storage_path.with_suffix(f'{self.storage_path.suffix}.lock')
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)

    def add_question_sql(self, question: str, sql: str, organization_id: str) -> str:
        def mutation(payload: dict) -> str:
            bucket = self._bucket(payload, organization_id)
            normalized_question = self._normalize_text(question)
            normalized_sql = self._normalize_sql(sql)

            existing = next(
                (
                    item
                    for item in bucket['question_sql']
                    if self._normalize_text(item['question']) == normalized_question
                    and self._normalize_sql(item['sql']) == normalized_sql
                ),
                None,
            )
            if existing:
                return existing['id']

            item_id = self._item_id('qsql', normalized_question + '|' + normalized_sql)
            bucket['question_sql'].append(
                {
                    'id': item_id,
                    'question': question,
                    'sql': sql,
                    'created_at': self._now(),
                }
            )
            self._enforce_question_sql_limit(bucket)
            return item_id

        return self._mutate_payload(mutation)

    def add_ddl(self, ddl: str, organization_id: str) -> str:
        def mutation(payload: dict) -> str:
            bucket = self._bucket(payload, organization_id)

            existing = next((item for item in bucket['ddl'] if item['content'] == ddl), None)
            if existing:
                return existing['id']

            item_id = self._item_id('ddl', ddl)
            bucket['ddl'].append(
                {
                    'id': item_id,
                    'content': ddl,
                    'created_at': self._now(),
                }
            )
            return item_id

        return self._mutate_payload(mutation)

    def add_documentation(self, documentation: str, organization_id: str) -> str:
        def mutation(payload: dict) -> str:
            bucket = self._bucket(payload, organization_id)

            existing = next(
                (item for item in bucket['documentation'] if item['content'] == documentation),
                None,
            )
            if existing:
                return existing['id']

            item_id = self._item_id('doc', documentation)
            bucket['documentation'].append(
                {
                    'id': item_id,
                    'content': documentation,
                    'created_at': self._now(),
                }
            )
            return item_id

        return self._mutate_payload(mutation)

    def get_similar_question_sql(
        self,
        question: str,
        organization_id: str,
        limit: int,
    ) -> list[dict[str, str]]:
        payload = self._load()
        bucket = self._bucket(payload, organization_id)

        ranked = sorted(
            bucket['question_sql'],
            key=lambda item: (
                self._similarity_score(question, item['question']),
                item['created_at'],
            ),
            reverse=True,
        )

        top = [
            {'question': item['question'], 'sql': item['sql']}
            for item in ranked
            if self._similarity_score(question, item['question']) > 0
        ][:limit]

        if top:
            return top

        return [
            {'question': item['question'], 'sql': item['sql']}
            for item in ranked[:limit]
        ]

    def get_related_ddl(
        self,
        question: str,
        organization_id: str,
        limit: int,
    ) -> list[str]:
        del question
        payload = self._load()
        bucket = self._bucket(payload, organization_id)
        return [item['content'] for item in bucket['ddl'][-limit:]][::-1]

    def get_related_documentation(
        self,
        question: str,
        organization_id: str,
        limit: int,
    ) -> list[str]:
        del question
        payload = self._load()
        bucket = self._bucket(payload, organization_id)
        return [item['content'] for item in bucket['documentation'][-limit:]][::-1]

    def list_training_data(self, organization_id: str) -> list[dict]:
        payload = self._load()
        bucket = self._bucket(payload, organization_id)

        items: list[dict] = []
        for item in bucket['question_sql']:
            items.append(
                {
                    'id': item['id'],
                    'kind': 'question_sql',
                    'question': item['question'],
                    'sql': item['sql'],
                    'created_at': item['created_at'],
                }
            )
        for item in bucket['ddl']:
            items.append(
                {
                    'id': item['id'],
                    'kind': 'ddl',
                    'content': item['content'],
                    'created_at': item['created_at'],
                }
            )
        for item in bucket['documentation']:
            items.append(
                {
                    'id': item['id'],
                    'kind': 'documentation',
                    'content': item['content'],
                    'created_at': item['created_at'],
                }
            )
        return sorted(items, key=lambda item: item['created_at'], reverse=True)

    def remove_training_data(self, id: str, organization_id: str) -> bool:
        def mutation(payload: dict) -> bool:
            bucket = self._bucket(payload, organization_id)

            for key in ('question_sql', 'ddl', 'documentation'):
                before = len(bucket[key])
                bucket[key] = [item for item in bucket[key] if item['id'] != id]
                if len(bucket[key]) != before:
                    return True
            return False

        return self._mutate_payload(mutation)

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _item_id(prefix: str, value: str) -> str:
        digest = hashlib.sha1(value.encode('utf-8')).hexdigest()[:10]
        return f'{prefix}_{digest}_{uuid4().hex[:6]}'

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        return set(re.findall(r'\w+', text.lower()))

    @staticmethod
    def _normalize_text(text: str) -> str:
        collapsed = re.sub(r'\s+', ' ', text.strip().lower())
        return re.sub(r'[^\w\s]', '', collapsed)

    @staticmethod
    def _normalize_sql(sql: str) -> str:
        return re.sub(r'\s+', ' ', sql.strip().rstrip(';').lower())

    def _similarity_score(self, left: str, right: str) -> float:
        left_tokens = self._tokenize(left)
        right_tokens = self._tokenize(right)
        if not left_tokens or not right_tokens:
            return 0.0
        overlap = len(left_tokens & right_tokens)
        if overlap == 0:
            return 0.0
        return overlap / max(len(left_tokens), len(right_tokens))

    def _load(self) -> dict:
        with self.lock_path.open('a+', encoding='utf-8') as lock_file:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_SH)
            data = self._load_unlocked()
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        return data

    def _load_unlocked(self) -> dict:
        if not self.storage_path.exists():
            return {}

        content = self.storage_path.read_text(encoding='utf-8').strip()
        if not content:
            return {}

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return {}

        if isinstance(data, dict):
            return data
        return {}

    def _save(self, payload: dict) -> None:
        with self.lock_path.open('a+', encoding='utf-8') as lock_file:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            self._save_unlocked(payload)
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    def _save_unlocked(self, payload: dict) -> None:
        serialized = json.dumps(payload, ensure_ascii=True, indent=2, sort_keys=True)
        with NamedTemporaryFile(
            mode='w',
            encoding='utf-8',
            delete=False,
            dir=self.storage_path.parent,
            prefix='training_store_',
            suffix='.tmp',
        ) as tmp_file:
            tmp_file.write(serialized)
            temp_path = Path(tmp_file.name)

        os.replace(temp_path, self.storage_path)

    def _mutate_payload(self, mutation):
        with self.lock_path.open('a+', encoding='utf-8') as lock_file:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            payload = self._load_unlocked()
            result = mutation(payload)
            self._save_unlocked(payload)
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        return result

    def _enforce_question_sql_limit(self, bucket: dict) -> None:
        if len(bucket['question_sql']) <= self.max_question_sql_per_org:
            return

        bucket['question_sql'] = bucket['question_sql'][-self.max_question_sql_per_org :]

    @staticmethod
    def _bucket(payload: dict, organization_id: str) -> dict:
        if organization_id not in payload:
            payload[organization_id] = {
                'question_sql': [],
                'ddl': [],
                'documentation': [],
            }
        return payload[organization_id]
