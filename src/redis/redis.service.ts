// src/redis/redis.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { REDIS_CLIENT } from './redis.provider';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    const value = await this.client.get<string>(key);
    return value ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incrWithWindow(key: string, windowSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    return count;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get<T>(key);
    return raw ?? null;
  }

  async setJson<T>(key: string, value: unknown, ttlSeconds?: number): Promise<T | void> {
    if (ttlSeconds) {
      await this.client.set(key, value as any, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value as any);
    }
  }
}