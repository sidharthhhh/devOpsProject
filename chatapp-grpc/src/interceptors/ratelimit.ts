class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number;

  constructor(maxTokens: number = 30, refillRate: number = 1) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  allow(): boolean {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();

  allow(userId: string): boolean {
    let bucket = this.buckets.get(userId);
    if (!bucket) {
      bucket = new TokenBucket();
      this.buckets.set(userId, bucket);
    }
    return bucket.allow();
  }
}
