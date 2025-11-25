import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  private cache: Record<string, { data: any; expires: number }> = {};

  set(key: string, data: any, ttlSeconds = 600) { // 10 minutes default
    this.cache[key] = {
      data,
      expires: Date.now() + ttlSeconds * 1000,
    };
  }

  get(key: string) {
    const item = this.cache[key];
    if (!item) return null;

    if (Date.now() > item.expires) {
      delete this.cache[key]; // expired
      return null;
    }

    return item.data;
  }

  del(key: string) {
    delete this.cache[key];
  }

  clear() {
    this.cache = {};
  }
}
