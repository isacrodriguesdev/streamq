import { Redis, RedisOptions } from "ioredis";

export declare class IRedis {
  constructor(ioRedisOptions: RedisOptions);
  constructor(ioredisIntance: Redis);
}