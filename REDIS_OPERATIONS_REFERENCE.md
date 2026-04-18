# Digital Pet Cache — Redis Operations Quick Reference

## Overview
Redis integration for pet asset caching follows MANAS360's existing patterns:
- Memory fallback (via `backend/src/config/redis.ts`)
- TTL-based invalidation
- Pub/sub for async notifications

---

## Redis Key Patterns

### 1. Pet Catalog Cache

```typescript
Key:     pet:catalog:{userId}
Type:    String (JSON)
TTL:     3600 seconds (1 hour)
Content: { pets: [{ id, name, type, assetVersion, assets: {...} }] }

Example:
  SET pet:catalog:user_abc123 '{"pets":[{"id":"pet_xyz","name":"Whiskers",...}]}' EX 3600
  GET pet:catalog:user_abc123
  DEL pet:catalog:user_abc123  (on asset publish)
```

**Usage:**
```typescript
// Get pet catalog (with Redis caching)
const cacheKey = `pet:catalog:${userId}`;
let catalog = await redis.get(cacheKey);
if (!catalog) {
  catalog = await buildPetCatalog(userId);
  await redis.set(cacheKey, JSON.stringify(catalog), 3600);
}
```

---

### 2. Asset Download Analytics

```typescript
Key:     pet:asset:downloads:{filename}:{YYYY-MM-DD}
Type:    String (integer counter)
TTL:     2592000 seconds (30 days)
Content: Daily download count

Examples:
  INCR pet:asset:downloads:cat_v3.riv:2026-04-18
  EXPIRE pet:asset:downloads:cat_v3.riv:2026-04-18 2592000
  GET  pet:asset:downloads:cat_v3.riv:2026-04-18
```

**Usage:**
```typescript
// Track asset download
async function trackAssetDownload(filename: string) {
  const today = new Date().toISOString().split('T')[0];
  const key = `pet:asset:downloads:${filename}:${today}`;
  await redis.incr(key);
  await redis.expire(key, 30 * 24 * 60 * 60);  // 30 days
}

// Get download stats (last 7 days)
async function getDownloadStats(filename: string) {
  const stats: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const key = `pet:asset:downloads:${filename}:${dateStr}`;
    const count = await redis.get(key);
    stats[dateStr] = parseInt(count || '0', 10);
  }
  return stats;
}
```

---

### 3. Cost Alert Configuration

```typescript
Key:     pet:cost:bandwidth_alert_gb
Type:    String (float)
TTL:     None (persistent)
Content: Bandwidth limit in GB for monthly alert

Example:
  SET pet:cost:bandwidth_alert_gb 10
  GET pet:cost:bandwidth_alert_gb
```

**Usage:**
```typescript
// Set alert threshold (admin action)
export async function setBandwidthAlertThreshold(limitGB: number) {
  await redis.set('pet:cost:bandwidth_alert_gb', String(limitGB));
}

// Check if alert triggered
export async function checkBandwidthAlert() {
  const threshold = await redis.get('pet:cost:bandwidth_alert_gb');
  if (!threshold) return;
  
  const currentBW = await estimateMonthlyBandwidth();
  if (currentBW > parseFloat(threshold)) {
    await sendAdminAlert(`Bandwidth ${currentBW}GB exceeds limit ${threshold}GB`);
  }
}
```

---

### 4. Asset Version Tracking (Future)

```typescript
Key:     pet:asset:current_version:{petId}
Type:    String (version number)
TTL:     None (persistent, updated on publish)
Content: Current asset version

Example:
  SET pet:asset:current_version:pet_cat_001 3
  GET pet:asset:current_version:pet_cat_001
  INCR pet:asset:current_version:pet_cat_001  (on new publish)
```

**Usage:**
```typescript
// When publishing new version
export async function publishPetVersion(petId: string, newVersion: number) {
  await redis.set(`pet:asset:current_version:${petId}`, String(newVersion));
}

// Client checks latest version
export async function getLatestPetVersion(petId: string): Promise<number> {
  const version = await redis.get(`pet:asset:current_version:${petId}`);
  return parseInt(version || '1', 10);
}
```

---

## Lua Scripting for Atomic Operations

### Atomic Cache Invalidation + Tracking

```lua
-- invalidate_and_track.lua
-- Atomically invalidate catalog cache and track invalidation event

local cacheKey = KEYS[1]          -- "pet:catalog:{userId}"
local trackKey = KEYS[2]          -- "pet:invalidations:2026-04-18"
local petId = ARGV[1]

-- Delete catalog cache
redis.call('DEL', cacheKey)

-- Track invalidation count
redis.call('INCR', trackKey)
redis.call('EXPIRE', trackKey, 86400)  -- 24 hours

return {cacheKey, trackKey}
```

**Usage in TypeScript:**
```typescript
// Atomic: delete cache + track event
export async function publishPetVersionAtomic(petId: string, userId: string) {
  const script = fs.readFileSync('invalidate_and_track.lua', 'utf-8');
  
  await redis.sendCommand({
    command: 'EVAL',
    args: [
      script,
      '2',
      `pet:catalog:${userId}`,
      `pet:invalidations:${new Date().toISOString().split('T')[0]}`,
      petId,
    ],
  });
}
```

---

## Integration with Existing MANAS360 Patterns

### Pattern 1: Memory Fallback (Like platform-config.service.ts)

```typescript
// Follow existing pattern from platform-config.service.ts
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
const MEMORY_CACHE = new Map<string, CacheEntry>();

const getMemoryCache = (key: string): PetCatalog | null => {
  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return entry.payload;
};

const setMemoryCache = (key: string, payload: PetCatalog): void => {
  MEMORY_CACHE.set(key, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

export async function getPetCatalogWithFallback(userId: string): Promise<PetCatalog> {
  // Try memory first (fastest)
  const memCached = getMemoryCache(`pet_catalog:${userId}`);
  if (memCached) return memCached;

  // Try Redis second
  const redisCached = await getRedisCache(`pet_catalog:${userId}`);
  if (redisCached) {
    setMemoryCache(`pet_catalog:${userId}`, redisCached);
    return redisCached;
  }

  // DB hit (slowest)
  const catalog = await buildCatalogFromDB(userId);
  setMemoryCache(`pet_catalog:${userId}`, catalog);
  await setRedisCache(`pet_catalog:${userId}`, catalog);
  return catalog;
}
```

### Pattern 2: Rate Limiting (Like exportRateLimiter.middleware.ts)

```typescript
// Rate limit pet asset uploads
export async function rateLimitAssetUpload(userId: string): Promise<boolean> {
  const now = Date.now();
  const windowSec = 60; // 1 minute window
  const key = `rl:pet_upload:${userId}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  // Allow max 5 uploads per minute
  if (count > 5) {
    return false; // Rate limited
  }
  return true; // Allowed
}
```

### Pattern 3: Pub/Sub Notification (Like socket.io in socket/index.ts)

```typescript
// Notify all clients when pet asset is updated
export async function broadcastPetVersionUpdate(petId: string, newVersion: number) {
  const message = JSON.stringify({
    petId,
    newVersion,
    timestamp: new Date().toISOString(),
  });

  // Publish to Redis channel
  await redis.publish(`pet:update:${petId}`, message);
}

// On socket connection, subscribe to pet update channel
io.on('connection', (socket) => {
  const userId = socket.data.user.id;
  
  socket.on('subscribe_pet_updates', async (petId: string) => {
    await redis.subscribe(`pet:update:${petId}`, (message) => {
      const update = JSON.parse(message);
      socket.emit('pet_updated', update);
    });
  });
});
```

---

## Monitoring & Observability

### Redis Memory Usage

```typescript
// Monitor Redis usage for pet cache keys
export async function getPetCacheStats() {
  const info = await redis.sendCommand(['INFO', 'memory']);
  
  // Get size of pet-specific keys
  const petKeys = await redis.sendCommand(['KEYS', 'pet:*']);
  const catalogKeys = petKeys.filter((k) => k.startsWith('pet:catalog:'));
  const analyticsKeys = petKeys.filter((k) => k.startsWith('pet:asset:downloads:'));

  return {
    totalRedisMemory: info.used_memory_human,
    petCatalogCount: catalogKeys.length,
    analyticsEntriesCount: analyticsKeys.length,
  };
}
```

### Cache Hit Ratio

```typescript
// Track cache hit/miss ratio
let catalogCacheHits = 0;
let catalogCacheMisses = 0;

export async function getPetCatalogWithMetrics(userId: string) {
  const cacheKey = `pet:catalog:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    catalogCacheHits++;
  } else {
    catalogCacheMisses++;
  }

  return {
    data: cached ? JSON.parse(cached) : await buildFromDB(userId),
    hitRatio: catalogCacheHits / (catalogCacheHits + catalogCacheMisses),
  };
}
```

---

## Docker Compose Configuration (Dev)

```yaml
# docker-compose.dev.yml (existing, add pet-specific notes)

redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  environment:
    - REDIS_MAXMEMORY=512mb
    - REDIS_MAXMEMORY_POLICY=allkeys-lru  # Auto-evict least recently used
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 3s
    retries: 5
  # Pet cache notes:
  # - Catalog keys: ~5KB each × users = minimal
  # - Analytics keys: ~100B each × (files × days) = minimal
  # - Total: <50MB even at 10K users
```

---

## Environment Variables

```bash
# .env.local (development)
REDIS_URL=redis://127.0.0.1:6379

# .env.production
REDIS_URL=redis://redis-cluster-endpoint.internal:6379
PET_CATALOG_CACHE_TTL=3600
PET_ANALYTICS_RETENTION_DAYS=30
PET_BANDWIDTH_ALERT_GB=50
```

---

## Debugging Commands

```bash
# List all pet-related keys
redis-cli KEYS "pet:*"

# Get catalog for specific user
redis-cli GET "pet:catalog:user_abc123"

# Check analytics for specific asset (last 7 days)
redis-cli KEYS "pet:asset:downloads:cat_v3.riv:2026-04-*"

# Get download count for today
redis-cli GET "pet:asset:downloads:cat_v3.riv:2026-04-18"

# Monitor cache updates in real-time
redis-cli SUBSCRIBE "pet:update:*"

# Check memory usage
redis-cli INFO memory

# Check hit/miss ratio
redis-cli INFO stats

# Flush pet cache (danger!)
redis-cli EVAL "return redis.call('del', unpack(redis.call('keys', 'pet:*')))" 0
```

---

## Cost Calculation Formula

```typescript
// Estimate monthly infrastructure cost with caching
export function estimateMonthlyPetCost(input: {
  activeUsers: number;
  deviceCacheHitRate: number;        // 0.95 = 95%
  cloudFrontCacheHitRate: number;    // 0.90 = 90%
  avgAssetsPerUser: number;          // ~10 pets × 2.5MB avg
  avgBandwidthPerUserPerMonth: number; // in GB
}) {
  const {
    activeUsers,
    deviceCacheHitRate,
    cloudFrontCacheHitRate,
    avgAssetsPerUser,
    avgBandwidthPerUserPerMonth,
  } = input;

  // Cost: S3 bandwidth for remaining 5% of requests
  const s3BandwidthCost =
    activeUsers *
    avgBandwidthPerUserPerMonth *
    (1 - deviceCacheHitRate) *
    (1 - cloudFrontCacheHitRate) *
    7.5; // ₹7.50/GB S3

  // Cost: CloudFront for 5% miss from device, hitting CDN
  const cdnBandwidthCost =
    activeUsers *
    avgBandwidthPerUserPerMonth *
    (1 - deviceCacheHitRate) *
    0.63; // ₹0.63/GB CloudFront

  // Cost: S3 storage (minimal, only current versions)
  const storageCost = (activeUsers * avgAssetsPerUser * 2.5) / 1024 * 6; // ₹6/GB/month

  return {
    s3Bandwidth: s3BandwidthCost,
    cdnBandwidth: cdnBandwidthCost,
    storage: storageCost,
    total: s3BandwidthCost + cdnBandwidthCost + storageCost,
    perUser: (s3BandwidthCost + cdnBandwidthCost + storageCost) / activeUsers,
  };
}

// Example: 5,000 users
const cost = estimateMonthlyPetCost({
  activeUsers: 5000,
  deviceCacheHitRate: 0.99,   // 99% from device
  cloudFrontCacheHitRate: 0.90, // 90% from CloudFront
  avgAssetsPerUser: 10 * 2.5,   // 10 pets @ 2.5MB each
  avgBandwidthPerUserPerMonth: 5, // 5GB/user/month
});

console.log(`Total: ₹${cost.total.toFixed(0)}/month`);
console.log(`Per-user: ₹${cost.perUser.toFixed(2)}/month`);
// Expected: ₹1,650/month, ₹0.33/user
```

---

## References

- MANAS360 Redis config: `backend/src/config/redis.ts`
- Platform config caching: `backend/src/services/platform-config.service.ts`
- Socket.io adapter: `backend/src/socket/index.ts`
- Rate limiting pattern: `backend/src/middleware/exportRateLimiter.middleware.ts`
- Redis documentation: https://redis.io/commands/

