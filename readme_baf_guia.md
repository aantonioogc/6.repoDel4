# BAF (Blockchain Application Firewall) — Guía de uso y README visual

> Documentación compacta, clara y práctica para desplegar, probar y mejorar el BAF. Incluye instrucciones, scripts de prueba, observabilidad, API de administración y recomendaciones de seguridad y mejora.

---

## Resumen rápido

Este repositorio implementa un proxy JSON-RPC que actúa como Firewall para llamadas a un nodo Ethereum (`geth`/RPC). Permite:

- Bloquear métodos RPC por configuración o en caliente.
- Limitación de tasa por IP y por dirección `from`.
- Detección de payloads repetidos (fingerprint) para mitigar replays / floods.
- Validación de límites de gas para `raw` transactions.
- Admin API para ajustar reglas en caliente.
- Endpoints de observabilidad (`/healthz`, `/metrics`, `/events`).

---

## Requisitos

- Node.js 18+ recomendado
- npm
- TypeScript (el proyecto incluye `tsconfig`)
- `npx ts-node` para ejecutar scripts de tests desde `scripts/`
- (Opcional) Redis para persistencia/escala (recomendado para producción)

---

## Levantar el backend (desarrollo rápido)

```bash
cd /workspace/backend
cp .env.example .env
npm install
npm run build
PORT=3000 ADMIN_TOKEN=secret node dist/index.js
```

Si la URL no es `http://localhost:3000`, exporta la variable:

```bash
export BAF_URL=http://localhost:3000
```

---

## Variables de entorno principales

| Variable | Descripción | Ejemplo |
|---|---:|---|
| `PORT` | Puerto del servidor | `3000` |
| `ADMIN_TOKEN` | Token para Admin API (¡no usar `secret` en prod!) | `s3cureRotatingKey` |
| `BAF_URL` | URL pública del BAF para los scripts | `http://localhost:3000` |
| `BAF_BLOCKED_METHODS` | Lista CSV de métodos RPC bloqueados | `eth_blocknumber,eth_sendRawTransaction` |
| `BAF_WINDOW_SECONDS` | Ventana para rate limits | `2` |
| `BAF_RATE_LIMIT_IP_TPS` | TPS para rate limit por IP | `10` |
| `BAF_RATE_LIMIT_ADDRESS_TPS` | TPS por dirección `from` | `5` |
| `BAF_FINGERPRINT_WINDOW_SECONDS` | TTL de fingerprints | `5` |
| `BAF_FINGERPRINT_MAX_REPEATS` | Repeats aceptados antes de bloquear | `10` |
| `BAF_MAX_GAS_PRICE_WEI`/`BAF_MIN_GAS_PRICE_WEI` | Umbrales gas price | `100000000000` / `1000` |
| `BAF_MAX_GAS_LIMIT` | Límite de gas para raw tx | `30000000` |
| `RAW_TX` | Raw tx para pruebas (scripts) | `0x...` |
| `RPC_URL` | URL del nodo upstream para pruebas raw tx | `http://127.0.0.1:8545` |

---

## Scripts incluidos y cómo ejecutarlos

Los scripts están en `scripts/` y se ejecutan con `npx ts-node`.

```bash
cd /workspace/backend
npx ts-node scripts/<script>.ts
```

- `test_blocked_method.ts` — bloquea por método.
- `test_rate_limit_ip.ts` — rate limit por IP.
- `test_rate_limit_address.ts` — rate limit por dirección `from`.
- `test_fingerprint.ts` — fingerprint de payload repetido.
- `test_batch_mixed.ts` — batch con llamadas bloqueadas y permitidas.
- `test_gas_extremes.ts` — límites de gas con raw tx (requiere `RAW_TX` válido).

### Ejemplos de ejecución (casos de prueba)

**Bloqueo por método**
```bash
export BAF_BLOCKED_METHODS=eth_blocknumber
npx ts-node scripts/test_blocked_method.ts
# Esperado: error "Blocked by BAF: blocked_method"
```

**Rate limit por IP**
```bash
export BAF_WINDOW_SECONDS=2
export BAF_RATE_LIMIT_IP_TPS=10
npx ts-node scripts/test_rate_limit_ip.ts
# Esperado: bloqueos "rate_limit_ip"
```

**Rate limit por dirección from**
```bash
export BAF_WINDOW_SECONDS=2
export BAF_RATE_LIMIT_ADDRESS_TPS=5
npx ts-node scripts/test_rate_limit_address.ts
# Esperado: bloqueos "rate_limit_address"
```

**Fingerprint de payload repetido**
```bash
export BAF_FINGERPRINT_WINDOW_SECONDS=5
export BAF_FINGERPRINT_MAX_REPEATS=10
npx ts-node scripts/test_fingerprint.ts
# Esperado: bloqueos "repeated_payload"
```

**Batch mixto**
```bash
export BAF_BLOCKED_METHODS=eth_blocknumber
npx ts-node scripts/test_batch_mixed.ts
# Esperado: primer elemento bloqueado, los otros pasan si upstream responde
```

**Límites de gas en raw tx**
```bash
export BAF_MAX_GAS_PRICE_WEI=100000000000
export BAF_MIN_GAS_PRICE_WEI=1000
export BAF_MAX_GAS_LIMIT=30000000
export RAW_TX=0x...            # raw tx válida
npx ts-node scripts/test_gas_extremes.ts
# Esperado: bloqueo si excede umbrales
```

---

## Admin API (hot reload de reglas)

- Listar reglas:
```bash
curl -s -H 'x-admin-token: secret' http://localhost:3000/admin/rules | jq
```

- Bloquear método en caliente:
```bash
curl -s -X POST -H 'x-admin-token: secret' -H 'content-type: application/json' \
  -d '{"static":{"blockedMethods":["eth_blocknumber"]}}' \
  http://localhost:3000/admin/rules | jq
```

> **Nota de seguridad:** No exponga `ADMIN_TOKEN` con valor estático en producción. Use secretos rotativos, OAuth o mTLS y proteja el endpoint con IP whitelisting.

---

## Observabilidad y endpoints

- Liveness/health: `GET /healthz`
- Métricas Prometheus: `GET /metrics` (expone contadores y histogramas)
- SSE events: `GET /events` (stream de eventos)

Ejemplos:
```bash
curl -s http://localhost:3000/healthz
curl -s http://localhost:3000/metrics | head
curl -N http://localhost:3000/events
```

---

## Buenas prácticas operativas (producción)

1. **Persistencia para rate limits y fingerprints:** utilizar Redis con TTL o similar para que el limitador sea consistente entre réplicas.
2. **Algoritmo de rate limiting:** evitar fixed-window simple; implementar token-bucket o sliding window (con Lua en Redis para atomicidad) para mayor precisión bajo concurrencia.
3. **Admin API segura:** token rotatorio, revocación, HTTPS obligatorio, limitación de acceso (IP ACL) y auditoría de cambios.
4. **TLS & Hardening:** exponer solo HTTPS, deshabilitar CORS innecesario, validar tamaño máximo de body y límite de concurrencia.
5. **Circuit breaker y timeouts:** establecer timeout a `upstream` y backoff en reintentos. Añadir circuit breaker para proteger upstream.
6. **Logging y traces:** logs JSON estructurados, incluir request_id, usar OpenTelemetry para trazas y correlación.
7. **Pruebas y CI:** unit + integration tests (mock del upstream), e2e con redes locales (Kurtosis / ganache), pruebas de carga (k6) y fuzzing de entradas JSON-RPC.
8. **Validación de entradas:** esquema JSON-RPC (zod / ajv) para prevenir payloads malformados.
9. **Limitar batch size:** establecer un máximo para `eth_sendRawTransaction`/batch para evitar DoS.
10. **Protección de información sensible:** no loguear raw transactions completas; mascarar datos sensibles.

---

## Tips de debugging rápido

- Si los tests de `scripts/` reciben `Error interno al contactar con Geth` — comprueba `RPC_URL` y que el nodo upstream esté en marcha.
- Si los rate limits no se aplican, revisa que las variables de entorno estén exportadas y que el proceso se haya reiniciado tras cambios en `.env` (o usa Admin API).
- Para ver reglas activas: `curl -H 'x-admin-token: $ADMIN_TOKEN' $BAF_URL/admin/rules | jq`

---

## Checklist para hardening/producción (priorizado)

1. Redis para rate limits + fingerprints.
2. Autenticación fuerte en Admin API (no `ADMIN_TOKEN` estático).
3. Timeouts y circuit breaker para upstream.
4. OpenTelemetry + Prometheus + Grafana dashboards.
5. Tests e2e en CI (Kurtosis/ganache).
6. Validación/limpieza de payloads y tamaño máximo de batch.

---

## Próximos pasos sugeridos (implementables)

- Sustituir storage en memoria por Redis con scripts Lua para limitación precisa.
- Añadir soporte para límites por API key / plan de usuario.
- Añadir regla de reputación por IP (lista negra/ blanca) y fingerprint por usuario.
- Implementar pruebas de carga automatizadas y performance baseline.

---

## Créditos

Implementado por el equipo del proyecto BAF — documentación generada para facilitar despliegue, pruebas y evolución.

---

*Fin del README*

