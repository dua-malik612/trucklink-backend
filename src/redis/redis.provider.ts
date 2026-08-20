import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new Redis({
      url: config.get<string>('UPSTASH_REDIS_REST_URL')!,
      token: config.get<string>('UPSTASH_REDIS_REST_TOKEN')!,
    });
  },
};