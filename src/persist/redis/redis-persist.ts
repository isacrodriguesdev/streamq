
import Redis, { RedisOptions } from "ioredis";
import { IRedis } from "./redis-interface";
import { IPersist } from "../../types";

export class RedisPersist implements IPersist, IRedis {
  private redis: Redis;
  private readonly messageKey = "message#";
  private readonly currentOffsetKey = "current_offset:";
  private readonly nextOffsetKey = "next_offset:";

  constructor(redis: RedisOptions | Redis) {
    if (redis instanceof Redis) {
      this.redis = redis;
    } else {
      this.redis = new Redis(redis);
    }
  }

  async createOffsetsIfNotExists(eventName: string): Promise<void> {
    const nextOffset = await this.redis.get(this.nextOffsetKey + eventName);
    const currentOffset = await this.redis.get(this.currentOffsetKey + eventName);

    if (!nextOffset) {
      await this.redis.set(this.nextOffsetKey + eventName, 0);
    }

    if (!currentOffset) {
      await this.redis.set(this.currentOffsetKey + eventName, 0);
    }
  }

  async setNextOffset(eventName: string, offset: number): Promise<void> {
    await this.redis.set(this.nextOffsetKey + eventName, offset);
  }

  async setCurrentOffset(eventName: string, offset: number): Promise<void> {
    await this.redis.set(this.currentOffsetKey + eventName, offset);
  }

  async getMessage(eventName: string, offset: number): Promise<any> {
    const message = await this.redis.get(this.messageKey + offset + ":" + eventName);
    if (!message) {
      return null;
    }
    return JSON.parse(message);
  }

  async getCurrentOffset(eventName: string): Promise<number> {
    const offset = await this.redis.get(this.currentOffsetKey + eventName);
    if (!offset) {
      await this.redis.set(this.currentOffsetKey + eventName, 0);
    }

    return offset ? parseInt(offset) : 0;
  }

  async getNextOffset(eventName: string): Promise<number> {
    const offset = await this.redis.get(this.nextOffsetKey + eventName);
    if (!offset) {
      await this.redis.set(this.nextOffsetKey + eventName, 0);
    }

    return offset ? parseInt(offset) : 0;
  }

  async addMessage(eventName: string, offset: number, value: any): Promise<void> {
    await this.redis.set(this.messageKey + offset + ":" + eventName, JSON.stringify({ offset, value, timestamp: Date.now() }));
    await this.setCurrentOffset(eventName, offset);
  }

  async removeMessage(eventName: string, offset: number): Promise<void> {
    await this.redis.del(this.messageKey + offset + ":" + eventName);
  }
} 