# Evaluación Experimental - Scripts de prueba BAF

Requisitos:
- Backend BAF en ejecución (ej. `PORT=3000 node dist/index.js`)
- `npm install` en `backend/`

Exporta la URL del BAF si no es `http://localhost:3000`:
```
export BAF_URL=http://localhost:3000
```

## 1) Bloqueo por método
Configura:
```
export BAF_BLOCKED_METHODS=eth_blocknumber
```
Ejecuta:
```
npx ts-node scripts/test_blocked_method.ts
```
Resultado esperado: respuesta con `error` "Blocked by BAF: blocked_method".

## 2) Rate limit por IP
Configura (ejemplo agresivo):
```
export BAF_WINDOW_SECONDS=2
export BAF_RATE_LIMIT_IP_TPS=10
```
Ejecuta carga:
```
npx ts-node scripts/test_rate_limit_ip.ts
```
Resultado: varias respuestas bloqueadas por `rate_limit_ip`.

## 3) Rate limit por dirección `from`
Configura:
```
export BAF_WINDOW_SECONDS=2
export BAF_RATE_LIMIT_ADDRESS_TPS=5
```
Ejecuta:
```
npx ts-node scripts/test_rate_limit_address.ts
```
Resultado: bloqueos por `rate_limit_address`.

## 4) Fingerprint de payload repetido
Configura:
```
export BAF_FINGERPRINT_WINDOW_SECONDS=5
export BAF_FINGERPRINT_MAX_REPEATS=10
```
Ejecuta:
```
npx ts-node scripts/test_fingerprint.ts
```
Resultado: bloqueos por `repeated_payload` si excede el máximo.

## 5) Batch mixto (bloqueado + permitido)
Configura bloqueo del método `eth_blockNumber`:
```
export BAF_BLOCKED_METHODS=eth_blocknumber
```
Ejecuta:
```
npx ts-node scripts/test_batch_mixed.ts
```
Resultado: el elemento 1 del batch bloqueado; el resto continúa (si el upstream está disponible).

## 6) Límites de gas (raw tx)
Configura:
```
export BAF_MAX_GAS_PRICE_WEI=100000000000
export BAF_MIN_GAS_PRICE_WEI=1000
export BAF_MAX_GAS_LIMIT=30000000
```
Prueba con una raw tx (necesitas una válida para tu red):
```
export RAW_TX=0x...
npx ts-node scripts/test_gas_extremes.ts
```
Resultado: bloqueo si sobrepasa umbrales.

## 7) Admin API (cambio en caliente)
Levanta el server con token:
```
PORT=3000 ADMIN_TOKEN=secret node dist/index.js
```
Lee reglas actuales:
```
curl -s -H 'x-admin-token: secret' http://localhost:3000/admin/rules | jq
```
Actualiza reglas (bloquear método):
```
curl -s -X POST -H 'x-admin-token: secret' -H 'content-type: application/json' \
  -d '{"static":{"blockedMethods":["eth_blocknumber"]}}' \
  http://localhost:3000/admin/rules | jq
```

## 8) Observabilidad
- Health: `curl -s http://localhost:3000/healthz`
- Métricas: `curl -s http://localhost:3000/metrics | head`
- Eventos SSE (otra terminal):
```
curl -N http://localhost:3000/events
```
Envía tráfico con los scripts para ver eventos.