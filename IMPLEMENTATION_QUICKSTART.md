# Digital Pet Cache Implementation — Quick Start

## Problem → Solution

| Before | After | Benefit |
|--------|-------|---------|
| **₹17/user/month** | **₹0.33/user/month** | **98% cost reduction** |
| Every app open fetches from S3 | Download once, cache forever | No daily bandwidth cost |
| Direct S3 URLs | CloudFront CDN only | 92% cheaper per GB |
| Single storage tier | Auto-tiered (IA → Glacier) | 44-85% storage savings |
| No device cache | Local SQLite/Hive cache | Offline support |

---

## 3 Implementation Phases

### Phase 1: Backend Infrastructure (Week 1-2)

**Objective:** Set up Redis caching + S3 asset structure + CloudFront

**Backend Changes:**
- [ ] Create `backend/src/services/pet-catalog.service.ts`
  ```typescript
  export async function getMyPetsWithCache(userId: string) {
    const cached = await redis.get(`pet:catalog:${userId}`);
    if (cached) return JSON.parse(cached);
    
    const catalog = await buildCatalog(userId);
    await redis.set(`pet:catalog:${userId}`, JSON.stringify(catalog), 3600);
    return catalog;
  }
  ```

- [ ] Create `backend/src/services/pet-asset-management.service.ts`
  ```typescript
  export async function publishPetVersion(petId: string, newRivFile: Buffer) {
    // Upload to S3 with status=current tag
    // Tag old version with status=deprecated
    // Invalidate Redis cache
  }
  ```

- [ ] Create `backend/src/middleware/pet-asset-analytics.middleware.ts`
  ```typescript
  export async function trackAssetDownload(filename: string) {
    const today = new Date().toISOString().split('T')[0];
    await redis.incr(`pet:asset:downloads:${filename}:${today}`);
  }
  ```

- [ ] Add Prisma migration: `PetAsset` table
  ```prisma
  model PetAsset {
    id        String   @id @default(cuid())
    petId     String
    pet       Pet      @relation(fields: [petId], references: [id])
    filename  String
    version   Int
    type      String   // animation|audio|environment|thumbnail
    checksum  String
    sizeBytes Int
    status    String   // current|deprecated|archived
    createdAt DateTime @default(now())
  }
  ```

- [ ] Add environment variables
  ```bash
  PET_CDN_URL=https://pets-cdn.manas360.com
  AWS_PET_ASSETS_BUCKET=manas360-pet-assets
  AWS_PET_ASSETS_REGION=ap-south-1
  ```

**Database Migration:**
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate:dev -- --name add_pet_assets
```

**Infrastructure (Terraform):**
- [ ] Create `infrastructure/terraform/cloudfront.tf`
  - CloudFront distribution (pets-cdn.manas360.com)
  - Origin Access Identity (OAI) — blocks direct S3 access
  - Cache TTL: 30 days
  - PriceClass_200 (India + Asia edges)

- [ ] Create `infrastructure/terraform/s3-lifecycle.tf`
  - Day 30: status=deprecated → S3-IA (44% cheaper)
  - Day 90: status=archived → Glacier (85% cheaper)
  - Day 365: delete from Glacier

**Deploy:**
```bash
cd infrastructure/terraform
terraform plan
terraform apply
# Output: pets-cdn.manas360.com domain
```

**Testing Phase 1:**
```bash
# Test cat asset is cached in Redis after first fetch
curl -X GET http://localhost:3001/api/pets/my-pets
redis-cli GET pet:catalog:user_xyz
# Expected: catalog JSON with CDN URLs

# Test analytics tracking
redis-cli GET pet:asset:downloads:cat_v3.riv:2026-04-18
# Expected: counter incremented on each download
```

---

### Phase 2: Flutter Device Cache (Week 3-4)

**Objective:** Implement device-side caching + offline support + WiFi pre-download

**Mobile Changes** (Flutter):
- [ ] Create `lib/repositories/asset_cache_repository.dart`
  ```dart
  class AssetCacheRepository {
    Future<String?> getLocalPathIfCached(String assetId, String version) async {
      final cached = box.get(assetId);
      if (cached?.version == version) return cached.localPath;
      if (cached != null) await deleteAsset(assetId);
      return null;
    }

    Future<void> cacheAsset(String assetId, String version, File file) async {
      await box.put(assetId, AssetCacheEntry(
        assetId: assetId,
        version: version,
        localPath: file.path,
        downloadedAt: DateTime.now(),
      ));
    }
  }
  ```

- [ ] Create `lib/services/pet_asset_manager.dart`
  ```dart
  Future<File> getPetAsset(String assetId, String version, String cdnUrl) async {
    // Check device cache first
    final localPath = cache.getLocalPathIfCached(assetId, version);
    if (localPath != null) return File(localPath);
    
    // Cache miss → download from CDN
    final response = await http.get(Uri.parse(cdnUrl));
    final file = await saveToDevice(assetId, response.bodyBytes);
    await cache.cacheAsset(assetId, version, file);
    return file;
  }
  ```

- [ ] Implement WiFi pre-download
  ```dart
  Future<void> preCacheAllOwnedPets() async {
    if ((await Connectivity().checkConnectivity()) != ConnectivityResult.wifi) return;
    
    final pets = await fetchMyPets();
    for (final pet in pets) {
      await getPetAsset(pet.assets.animation.filename, ...);
    }
  }
  ```

**API Contract Update:**
```json
GET /api/pets/my-pets
Response:
{
  "pets": [{
    "id": "pet_xyz",
    "assetVersion": 3,
    "assets": {
      "animation": {
        "filename": "cat_v3.riv",
        "cdnUrl": "https://pets-cdn.manas360.com/rive/cat_v3.riv",
        "checksum": "sha256:...",
        "sizeBytes": 2500000
      }
    }
  }]
}
```

**Testing Phase 2:**
```bash
# Test 1: Device cache
1. Open app → see pet load from CDN
2. Close app, reopen → pet loads from device cache (faster)

# Test 2: Offline mode
1. Enable airplane mode
2. Open app → pet loads from device cache ✅
3. Try to load new pet → error as expected ✅

# Test 3: WiFi pre-download
1. Connect to WiFi
2. App runs background task: all pets downloaded
3. Disconnect WiFi
4. All owned pets load instantly from device ✅
```

---

### Phase 3: Monitoring + Optimization (Week 5-6)

**Objective:** Verify cost reduction + set up alerts + optimize asset sizes

**Monitoring Setup:**
- [ ] CloudWatch: S3 direct GETs should be <1/day
- [ ] CloudWatch: CloudFront cache hit ratio >90%
- [ ] Redis: `pet:asset:downloads:*` counters
- [ ] Monthly cost report: verify <₹1/user/month

**Cost Verification Script:**
```typescript
// backend/src/admin/verify-pet-cost.ts
const cost = estimateMonthlyPetCost({
  activeUsers: 5000,
  deviceCacheHitRate: 0.99,
  cloudFrontCacheHitRate: 0.90,
  avgAssetsPerUser: 25,  // 10 pets × 2.5MB
  avgBandwidthPerUserPerMonth: 5,
});

console.log(`Expected cost: ₹${cost.total}/month (₹${cost.perUser}/user)`);
// Target: ₹1,650/month, ₹0.33/user
```

**Asset Optimization:**
- [ ] Audit all .riv files (target: <5 MB each)
- [ ] Audio: convert to 128kbps MP3 (reduce ~30%)
- [ ] Thumbnails: convert to WebP (<50KB)
- [ ] Verify CloudFront gzip compression (~30% ratio)

**SOP Documentation:**
- [ ] Artist uploads new .riv file
- [ ] Admin panel: create pet version + upload to S3
- [ ] Automatic: old version tagged deprecated
- [ ] Automatic: lifecycle rules handle storage tier migration
- [ ] Quarterly: review cost/cache hits/storage size

---

## Quick Reference: Redis Keys

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `pet:catalog:{userId}` | String | 1 hour | Pet list + asset metadata |
| `pet:asset:downloads:{filename}:{date}` | String | 30 days | Daily download count |
| `pet:cost:bandwidth_alert_gb` | String | Persistent | Cost alert threshold |

---

## Quick Reference: S3 Structure

```
s3://manas360-pet-assets/
├── rive/
│   ├── cat_v1.riv (deprecated → IA after 30d)
│   ├── cat_v2.riv (deprecated)
│   └── cat_v3.riv (current)
├── audio/
│   ├── cat_purr_v1.mp3
│   └── cat_meow_v2.mp3
└── thumbnails/
    ├── cat_128x128.webp
    └── dog_256x256.webp
```

**Rule:** All URLs go through `pets-cdn.manas360.com`, never direct S3.

---

## Quick Reference: Cost Projections

### Per-User Monthly

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| S3 bandwidth | ₹16.80 | ₹0 (device cached) | 100% |
| CloudFront | — | ₹0.03 (amortized) | — |
| S3 GET requests | ₹0.06 | ₹0.001 | 98% |
| Stats sync | ₹0.30 | ₹0.30 | 0% |
| Storage | ₹0.001 | ₹0.001 | 0% |
| **Total** | **₹17.16** | **₹0.33** | **98%** |

### At 5,000 Users/Month

| Metric | Before | After |
|--------|--------|-------|
| Revenue | ₹4,95,000 | ₹4,95,000 |
| Infra cost | ₹85,300 | ₹1,650 |
| **Margin recovery** | **17% hit** | **+83,650/month saved** |

---

## Common Issues & Solutions

### Issue: S3 direct access not blocked

**Solution:** Verify OAI bucket policy is applied:
```bash
aws s3api get-bucket-policy --bucket manas360-pet-assets
# Should show only CloudFront OAI has GetObject permission
```

### Issue: CloudFront cache hits <70%

**Likely cause:** Query strings breaking cache keys
**Solution:** Remove query params from CDN URLs, use immutable filenames

### Issue: Device cache growing too large

**Solution:** Implement size limit + LRU eviction:
```dart
const MAX_CACHE_SIZE_MB = 100;
if (cache.getTotalSizeBytes() > MAX_CACHE_SIZE_MB * 1024 * 1024) {
  cache.evictLRU();
}
```

---

## Rollback Plan

If issues occur:

1. **S3 direct access** → Disable CloudFront, apps fall back to direct S3
2. **Device cache bugs** → Clear cache, re-download from CDN
3. **Cost explosion** → Check for cache key bugs in Redis

---

## Success Criteria

- ✅ Device cache hit rate >95%
- ✅ CloudFront cache hit ratio >90%
- ✅ S3 direct GETs <1/day
- ✅ Cost per user <₹1/month
- ✅ Offline support working
- ✅ Asset updates propagate via version bump
- ✅ SOP documented + tested

---

## Next Steps After Completion

1. Scale to other asset types (environments, UI animations)
2. Add download scheduling (download during off-peak hours)
3. Integrate CDN cost reports into admin dashboard
4. A/B test device cache sizes on low-RAM devices

---

## Files Created/Modified

### New Files
- `backend/src/services/pet-catalog.service.ts`
- `backend/src/services/pet-asset-management.service.ts`
- `backend/src/middleware/pet-asset-analytics.middleware.ts`
- `backend/src/routes/admin-pets.ts`
- `infrastructure/terraform/cloudfront.tf`
- `infrastructure/terraform/s3-lifecycle.tf`
- `lib/repositories/asset_cache_repository.dart` (Flutter)
- `lib/services/pet_asset_manager.dart` (Flutter)

### Documentation
- `DIGITAL_PET_CACHE_IMPLEMENTATION.md` (this repo)
- `REDIS_OPERATIONS_REFERENCE.md` (this repo)
- `/memories/repo/digital-pet-cache-redis.md` (internal)

---

## Timeline

| Phase | Duration | Deliverable | Cost Achieved |
|-------|----------|-------------|---------------|
| Phase 1 | Weeks 1-2 | Backend + CloudFront | <₹5/user |
| Phase 2 | Weeks 3-4 | Device cache + offline | <₹1/user |
| Phase 3 | Weeks 5-6 | Monitoring + SOP | **₹0.33/user** |

---

## Owner & Support

- **Backend:** [Backend team]
- **Mobile:** [Flutter team]
- **Infrastructure:** [DevOps team]
- **Analytics:** [Data team]

Questions? See: `DIGITAL_PET_CACHE_IMPLEMENTATION.md` or `REDIS_OPERATIONS_REFERENCE.md`

