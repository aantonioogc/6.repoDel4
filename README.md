# Blockchain Application Firewall (BAF)

Backend del TFG: un cortafuegos de aplicación para bloquear/permitir llamadas JSON-RPC a un nodo Ethereum según reglas estáticas y heurísticas.

## Requisitos

- Node.js 18+
- Un nodo Ethereum de upstream (por ejemplo, Geth/Nethermind/Erigon) accesible por HTTP JSON-RPC

## Configuración

1. Copia `.env.example` a `.env` y ajusta variables:

```
cp .env.example .env
```

Variables principales:
- `UPSTREAM_RPC_URL`: URL del nodo JSON-RPC
- `BAF_ALLOWED_METHODS` / `BAF_BLOCKED_METHODS`: listas separadas por comas
- `BAF_BLOCKED_ADDRESSES`: direcciones en minúscula
- `BAF_RATE_LIMIT_*`: límites heurísticos

## Desarrollo

```
yarn install
yarn dev
```

o con npm:

```
npm install
npm run dev
```

El servidor expone:
- `POST /` JSON-RPC (también batch)
- `GET /metrics` Prometheus
- `GET /healthz` Healthcheck
- `GET /dashboard` Dashboard sencillo
- `GET /events` SSE de eventos
- `GET/POST /admin/rules` API de administración (usar `ADMIN_TOKEN`)

## Evaluación Experimental (scripts)
Consulta `scripts/README.md` para pruebas desde terminal que cubren:
- Bloqueo por método
- Rate limit por IP y por dirección
- Fingerprint de payload
- Batch mixto
- Límites de gas en raw tx
- Admin API y observabilidad

Ejemplo rápido (bloqueo por método):
```
export BAF_BLOCKED_METHODS=eth_blocknumber
npx ts-node scripts/test_blocked_method.ts
```

## Ejemplo de prueba

```
curl -s http://localhost:3000 -H 'content-type: application/json' -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq
```

Si activas `BAF_BLOCKED_METHODS=eth_blocknumber`, debería devolver error bloqueado.