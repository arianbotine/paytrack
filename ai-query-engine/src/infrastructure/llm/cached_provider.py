from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
import json
import threading

from src.domain.interfaces.llm_provider import LLMProvider


@dataclass
class _PendingPrompt:
    event: threading.Event
    result: str | None = None
    error: BaseException | None = None


class CachedLLMProvider(LLMProvider):
    def __init__(self, provider: LLMProvider, max_entries: int = 128):
        self.provider = provider
        self.max_entries = max(max_entries, 1)
        self._lock = threading.Lock()
        self._cache: OrderedDict[str, str] = OrderedDict()
        self._in_flight: dict[str, _PendingPrompt] = {}

    def generate(self, prompt: str) -> str:
        return self._run_once(
            cache_key=f'prompt:{prompt}',
            producer=lambda: self.provider.generate(prompt),
        )

    def generate_insights(
        self,
        question: str,
        sql: str,
        result: list[dict],
        response_mode: str = 'basic',
    ) -> str:
        payload = json.dumps(
            {
                'question': question,
                'sql': sql,
                'result': result,
                'response_mode': response_mode,
            },
            ensure_ascii=False,
            default=str,
            sort_keys=True,
        )
        return self._run_once(
            cache_key=f'insights:{payload}',
            producer=lambda: self.provider.generate_insights(
                question=question,
                sql=sql,
                result=result,
                response_mode=response_mode,
            ),
        )

    def _run_once(self, cache_key: str, producer) -> str:
        cached_result = self._get_cached(cache_key)
        if cached_result is not None:
            return cached_result

        with self._lock:
            cached_result = self._cache.get(cache_key)
            if cached_result is not None:
                self._cache.move_to_end(cache_key)
                return cached_result

            pending = self._in_flight.get(cache_key)
            if pending is None:
                pending = _PendingPrompt(event=threading.Event())
                self._in_flight[cache_key] = pending
                is_leader = True
            else:
                is_leader = False

        if not is_leader:
            pending.event.wait()
            if pending.error is not None:
                raise pending.error
            return pending.result or ''

        try:
            result = producer()
        except BaseException as error:
            self._finish_prompt(cache_key, pending, error=error)
            raise

        self._finish_prompt(cache_key, pending, result=result)
        return result

    def _get_cached(self, cache_key: str) -> str | None:
        with self._lock:
            cached_result = self._cache.get(cache_key)
            if cached_result is not None:
                self._cache.move_to_end(cache_key)
            return cached_result

    def _finish_prompt(
        self,
        cache_key: str,
        pending: _PendingPrompt,
        result: str | None = None,
        error: BaseException | None = None,
    ) -> None:
        with self._lock:
            if error is None and result is not None:
                self._cache[cache_key] = result
                self._cache.move_to_end(cache_key)
                while len(self._cache) > self.max_entries:
                    self._cache.popitem(last=False)

            pending.result = result
            pending.error = error
            pending.event.set()
            self._in_flight.pop(cache_key, None)
