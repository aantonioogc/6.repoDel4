// Update the import path if the file is located elsewhere, for example:
import { setValue, getValue } from "../src/redis/redisClient";

async function main() {
  await setValue("ip:127.0.0.1", "bloqueada");
  const estado = await getValue("ip:127.0.0.1");
  console.log("Estado de la IP:", estado);
}

main();
