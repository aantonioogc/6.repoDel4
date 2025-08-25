import IORedis from 'ioredis';

const redis = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

export const setValue = async (key: string, value: string) => {
  await redis.set(key, value);
};

export const getValue = async (key: string): Promise<string | null> => {
  return await redis.get(key);
};

export default redis;