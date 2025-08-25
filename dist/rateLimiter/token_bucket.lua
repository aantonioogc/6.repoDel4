-- Redis token-bucket Lua script (atomic)
-- KEYS[1] = key
-- ARGV[1] = capacity (tokens)
-- ARGV[2] = refill_per_ms (tokens per millisecond)
-- ARGV[3] = now_ms (current timestamp in ms)
-- ARGV[4] = requested (tokens to consume)
--
-- Returns 1 if allowed (tokens consumed), 0 if not allowed.
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_per_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local current = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(current[1])
local last = tonumber(current[2])

if tokens == nil then tokens = capacity end
if last == nil then last = now end

local delta = math.max(0, now - last)
local filled = tokens + delta * refill_per_ms
if filled > capacity then filled = capacity end

local allowed = 0
local new_tokens = filled
if filled >= requested then
  allowed = 1
  new_tokens = filled - requested
end

redis.call('HMSET', key, 'tokens', new_tokens, 'last', now)
local ttl_ms = math.ceil((capacity / refill_per_ms) + 1000)
redis.call('PEXPIRE', key, ttl_ms)

return allowed