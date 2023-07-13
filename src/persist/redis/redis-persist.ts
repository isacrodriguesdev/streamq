import { Logger } from "@isacrodriguesdev/logger";
import Redis, { RedisOptions } from "ioredis";
import { StreamQPersist } from "../../types";

class RedisPersist implements StreamQPersist {
  private redis: Redis;
  private readonly messageKey = ":message:";
  private readonly currentOffsetKey = "offset:";
  private readonly nextOffsetKey = "next_offset:";
  private readonly logger = new Logger();

  constructor(redis: RedisOptions | Redis) {
    if (redis instanceof Redis) {
      this.redis = redis;
    } else {
      this.redis = new Redis(redis);

      this.redis.on("error", (error) => {
        this.logger.notify(["console"], {
          level: "error",
          message: "Error on Redis connection.",
          additionalInfo: error,
        });
      });
    }
  }

  async setNextOffset(event: string, offset: number): Promise<void> {
    await this.redis.set(this.nextOffsetKey + event, offset);
  }

  async setOffset(event: string, offset: number): Promise<void> {
    await this.redis.set(this.currentOffsetKey + event, offset);
  }

  async getMessage(event: string, offset: number): Promise<any> {
    const message = await this.redis.get(offset + this.messageKey + ":" + event);
    if (!message) {
      return null;
    }
    return JSON.parse(message);
  }

  async getOffset(event: string): Promise<number> {
    const offset = await this.redis.get(this.currentOffsetKey + event);
    if (!offset) {
      await this.redis.set(this.currentOffsetKey + event, 0);
    }

    return offset ? parseInt(offset) : 0;
  }

  async getNextOffset(event: string): Promise<number> {
    const offset = await this.redis.get(this.nextOffsetKey + event);
    if (!offset) {
      await this.redis.set(this.nextOffsetKey + event, 0);
    }

    return offset ? parseInt(offset) : 0;
  }

  async addMessage(event: string, offset: number, value: any, retentionTime: number): Promise<void> {
    await this.redis.set(
      offset + this.messageKey + ":" + event,
      JSON.stringify({ offset, value, timestamp: Date.now() }),
      "EX",
      retentionTime * 60
    );
  }

  async removeMessage(event: string, offset: number): Promise<void> {
    await this.redis.del(offset + this.messageKey + ":" + event);
  }
}

export function redisPersist(redis: RedisOptions | Redis): RedisPersist {
  return new RedisPersist(redis);
}
