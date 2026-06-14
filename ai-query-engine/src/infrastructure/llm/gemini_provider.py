import json

import httpx

from src.domain.exceptions.errors import ExternalProviderError, ValidationError
from src.domain.interfaces.llm_provider import LLMProvider


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        if not api_key:
            raise ValidationError('GEMINI_API_KEY is required when LLM_PROVIDER=gemini')
        self.api_key = api_key
        self.model = model
        self.base_url = 'https://generativelanguage.googleapis.com/v1beta'

    def generate(self, prompt: str) -> str:
        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(
                    f'{self.base_url}/models/{self.model}:generateContent',
                    params={'key': self.api_key},
                    json={
                        'contents': [
                            {
                                'parts': [
                                    {
                                        'text': prompt,
                                    }
                                ]
                            }
                        ]
                    },
                )
            if response.status_code >= 400:
                details = (response.text or '').strip().replace('\n', ' ')
                details = details[:220]
                raise ExternalProviderError(
                    f'Gemini request failed with status {response.status_code}: {details}'
                )

            payload = response.json()
            candidates = payload.get('candidates') or []
            if not candidates:
                raise ExternalProviderError('Gemini returned no candidates')

            content = candidates[0].get('content', {})
            parts = content.get('parts') or []
            if not parts:
                raise ExternalProviderError('Gemini returned empty content')

            return parts[0].get('text', '').strip()
        except httpx.TimeoutException as exc:
            raise ExternalProviderError('Gemini request timed out') from exc
        except httpx.HTTPError as exc:
            raise ExternalProviderError('Gemini request failed') from exc
        except json.JSONDecodeError as exc:
            raise ExternalProviderError('Gemini returned invalid JSON') from exc

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
