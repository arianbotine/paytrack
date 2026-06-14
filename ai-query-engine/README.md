# AI Query Engine

Microservico Python (FastAPI) para transformar linguagem natural em SQL seguro, executar consultas no PostgreSQL e retornar resposta conversacional.

## Endpoints

- `GET /health`
- `POST /chat`
- `POST /training`

### Request /chat

```json
{
  "message": "Qual foi o faturamento dos ultimos 6 meses?",
  "organization_id": "org_123"
}
```

### Request /training

Treina o provider Vanna OSS por organizacao (requer `TEXT_TO_SQL_PROVIDER=vanna_oss`).

Exemplos de payload (envie apenas um modo por request):

```json
{
  "organization_id": "org_123",
  "question": "Qual o total de contas por status?",
  "sql": "SELECT status, COUNT(*) FROM payables WHERE organization_id = 'org_123' GROUP BY status"
}
```

```json
{
  "organization_id": "org_123",
  "ddl": "CREATE TABLE payables (id uuid, organization_id uuid, ... )"
}
```

```json
{
  "organization_id": "org_123",
  "documentation": "status pode ser OPEN, PAID ou OVERDUE"
}
```

Resposta:

```json
{
  "id": "qsql_xxxxx",
  "status": "stored"
}
```

## Execucao local

```bash
cd ai-query-engine
cp .env.example .env
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

## Configuracao Text-to-SQL

- `TEXT_TO_SQL_PROVIDER=vanna`: provider atual baseado em prompt (legado).
- `TEXT_TO_SQL_PROVIDER=vanna_oss`: provider modular usando Vanna OSS + armazenamento local de treino.
- `VANNA_RETRIEVAL_LIMIT=5`: quantidade maxima de itens de retrieval por consulta.
- `VANNA_TRAINING_STORAGE_PATH=data/vanna/training_store.json`: arquivo local de treinamento por organizacao.

## Docker

```bash
docker build -t ai-query-engine .
docker run --rm -p 8000:8000 --env-file .env ai-query-engine
```

## Teste ponta a ponta local

1. Suba banco + AI Engine via Docker Compose na raiz do monorepo:

```bash
cd ..
docker compose up -d db ai-query-engine
```

2. Health check do AI Engine:

```bash
curl -sS http://localhost:8000/health
```

3. Smoke test direto no AI Engine:

```bash
curl -sS -X POST http://localhost:8000/chat \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: change-me' \
  -d '{"message":"Qual foi meu faturamento total?","organization_id":"<ORG_ID>"}'
```

4. Suba o backend apontando para o AI Engine local:

```bash
cd ../backend
AI_SERVICE_URL=http://localhost:8000 AI_SERVICE_API_KEY=change-me npm run start:dev
```

5. Obtenha token com organização e teste o gateway:

```bash
LOGIN_JSON=$(curl -sS -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@paytrack.com","password":"admin123"}')

ACCESS_TOKEN=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d['accessToken'])" "$LOGIN_JSON")
ORG_ID=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d['user']['availableOrganizations'][0]['id'])" "$LOGIN_JSON")

ORG_JSON=$(curl -sS -X POST http://localhost:3000/api/auth/select-organization \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"organizationId\":\"$ORG_ID\"}")

ORG_TOKEN=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d['accessToken'])" "$ORG_JSON")

curl -sS -X POST http://localhost:3000/api/ai-query/chat \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ORG_TOKEN" \
  -d '{"message":"Qual foi meu faturamento total?"}'
```
