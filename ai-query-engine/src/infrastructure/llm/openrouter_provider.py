import json

import httpx

from src.domain.exceptions.errors import ExternalProviderError, ValidationError
from src.domain.interfaces.llm_provider import LLMProvider


class OpenRouterProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        if not api_key:
            raise ValidationError(
                'OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter'
            )
        self.api_key = api_key
        self.model = model
        self.base_url = 'https://openrouter.ai/api/v1/chat/completions'

    def generate(self, prompt: str) -> str:
        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(
                    self.base_url,
                    headers={
                        'Authorization': f'Bearer {self.api_key}',
                        'Content-Type': 'application/json',
                    },
                    json={
                        'model': self.model,
                        'messages': [
                            {
                                'role': 'user',
                                'content': prompt,
                            }
                        ],
                        'temperature': 0.2,
                    },
                )

            if response.status_code >= 400:
                details = (response.text or '').strip().replace('\n', ' ')
                details = details[:220]
                raise ExternalProviderError(
                    f'OpenRouter request failed with status {response.status_code}: {details}'
                )

            payload = response.json()
            choices = payload.get('choices') or []
            if not choices:
                raise ExternalProviderError('OpenRouter returned no choices')

            message = choices[0].get('message', {})
            content = message.get('content', '')
            if not content:
                raise ExternalProviderError('OpenRouter returned empty content')

            return content.strip()
        except httpx.TimeoutException as exc:
            raise ExternalProviderError('OpenRouter request timed out') from exc
        except httpx.HTTPError as exc:
            raise ExternalProviderError('OpenRouter request failed') from exc
        except json.JSONDecodeError as exc:
            raise ExternalProviderError('OpenRouter returned invalid JSON') from exc

    def generate_insights(
        self,
        question: str,
        sql: str,
        result: list[dict],
        response_mode: str = 'basic',
    ) -> str:
        if response_mode == 'advanced':
            prompt = (
                'Voce e um analista financeiro senior. Responda em portugues brasileiro, '
                'com profundidade analitica, mas mantendo clareza.\n\n'
                f'Pergunta: {question}\n'
                f'SQL: {sql}\n'
                f'Resultado JSON: {json.dumps(result, ensure_ascii=False, default=str)}\n\n'
                'Forneca:\n'
                '1. Resposta direta.\n'
                '2. Leitura analitica dos dados.\n'
                '3. Possiveis limitacoes, suposicoes ou cuidados na interpretacao.\n'
                '4. Oportunidades de aprofundamento com novas perguntas.'
            )
        else:
            prompt = (
                'Voce e um analista financeiro. Responda em portugues brasileiro, '
                'de forma objetiva, amigavel e sem jargao tecnico.\n\n'
                f'Pergunta: {question}\n'
                f'Resultado JSON: {json.dumps(result, ensure_ascii=False, default=str)}\n\n'
                'Forneca uma resposta curta com: conclusao principal, no maximo 2 insights '
                'e uma observacao de cautela apenas se realmente necessario.'
            )
        return self.generate(prompt)
