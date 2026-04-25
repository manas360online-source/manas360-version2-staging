# Digital Pet S3 Cache Optimization — Implementation Guide

## Overview

This document maps the Digital Pet S3 Cache Optimization strategy (from `Digital_Pet_S3_Cache_Optimization_Tier2.md`) to the existing MANAS360 backend infrastructure. The goal is to reduce per-user infrastructure cost from **₹17/month → ₹0.33/month** for Tier 2 Interactive Pets by implementing a 3-layer caching strategy.

---

## Current Architecture Context

### Existing Redis Patterns in MANAS360

The backend already has a mature Redis layer:

| Component | Location | Purpose |
|-----------|----------|---------|
| **Core Redis Client** | `backend/src/config/redis.ts` | Generic key-value cache with memory fallback |
| **Platform Config Cache** | `backend/src/services/platform-config.service.ts` | 5-min TTL, dual-layer (memory + Redis) |
| **Analytics Cache** | `backend/src/services/analytics.service.ts` | 300s TTL for dashboard aggregations |
| **Socket.io Adapter** | `backend/src/socket/index.ts` | Redis pub/sub + stream consumer (XREAD) |
| **Presence Tracking** | `backend/src/controllers/presence.controller.ts` | Real-time session presence via sorted sets (ZSET) |
| **Rate Limiting** | `backend/src/middleware/exportRateLimiter.middleware.ts` | Sliding window via `INCR` + `EXPIRE` |
| **Subscription Idempotency** | `backend/src/services/subscription.service.ts` | Redis-backed webhook deduplication |

### AWS S3 Setup

- **Bucket:** `AWS_S3_BUCKET` (via env)
- **Region:** `AWS_REGION` (default: ap-south-1)
- **Endpoint:** Optional MinIO support via `AWS_S3_ENDPOINT`
- **Signed URLs:** Already used for profile photos, therapist docs, exports

---

## Layer 1: Device-Side Caching (Flutter/Mobile)

### Concept

Pet animation files (.riv) and audio assets are **immutable once published**. Download once on first open → save to device storage → serve from device forever (until version bumps).

### Implementation (Flutter/Mobile App)

#### 1.1 Asset Version Tracking

Create a local SQLite/Hive cache table:

```dart
// asset_cache_repository.dart
class AssetCacheEntry {
  final String assetId;        // 'cat_v3.riv', 'dog_v2.mp3'
  final String version;        // '3', '2'
  final String assetType;      // 'animation', 'audio', 'environment'
  final DateTime downloadedAt;
  final int fileSizeBytes;
  final String localPath;      // Device storage path
  final String checksum;       // SHA256 for verification
}

class AssetCacheRepository {
  final box = Hive.box<AssetCacheEntry>('asset_cache');

  /// Get local path if cached and version matches
  String? getLocalPathIfCached(String assetId, String requiredVersion) {
    final cached = box.get(assetId);
    if (cached == null) return null;
    if (cached.version != requiredVersion) {
      // Version mismatch — delete old version and return null
      deleteAsset(assetId);
      return null;
    }
    return cached.localPath;
  }

  /// Save asset to local storage and record cache entry
  Future<void> cacheAsset(String assetId, String version, String assetType, 
                          File localFile, String checksum) async {
    final entry = AssetCacheEntry(
      assetId: assetId,
      version: version,
      assetType: assetType,
      downloadedAt: DateTime.now(),
      fileSizeBytes: await localFile.length(),
      localPath: localFile.path,
      checksum: checksum,
    );
    await box.put(assetId, entry);
  }

  /// Delete asset from device
  Future<void> deleteAsset(String assetId) async {
    final cached = box.get(assetId);
    if (cached != null && File(cached.localPath).existsSync()) {
      await File(cached.localPath).delete();
    }
    await box.delete(assetId);
  }

  /// Compute total cache size
  int getTotalCacheSizeBytes() =>
      box.values.fold<int>(0, (sum, entry) => sum + entry.fileSizeBytes);
}
```

#### 1.2 Pet Catalog API Response Format

Backend API (e.g., `GET /api/pets/my-pets`) should return version info:

```json
{
  "pets": [
    {
      "id": "pet_xyz",
      "name": "Whiskers",
      "type": "cat",
      "assetVersion": 3,
      "assets": {
        "animation": {
          "filename": "cat_v3.riv",
          "cdnUrl": "https://pets-cdn.manas360.com/rive/cat_v3.riv",
          "checksum": "sha256:abc123...",
          "sizeBytes": 2500000
        },
        "audio": [
          {
            "id": "purr",
            "filename": "cat_purr_v1.mp3",
            "cdnUrl": "https://pets-cdn.manas360.com/audio/cat_purr_v1.mp3",
            "checksum": "sha256:def456...",
            "sizeBytes": 180000
          }
        ]
      }
    }
  ]
}
```

#### 1.3 Download & Cache Logic

```dart
// pet_asset_manager.dart
class PetAssetManager {
  final assetCache = AssetCacheRepository();
  final httpClient = http.Client();

  /// Load pet asset — from device cache or CDN
  Future<File> getPetAsset(String assetId, String version, String cdnUrl) async {
    // Check device cache first
    final localPath = assetCache.getLocalPathIfCached(assetId, version);
    if (localPath != null) {
      return File(localPath);
    }

    // Cache miss — download from CDN
    final response = await httpClient.get(Uri.parse(cdnUrl));
    if (response.statusCode != 200) {
      throw Exception('Failed to download asset: ${response.statusCode}');
    }

    // Save to device storage
    final localDir = await getApplicationCacheDirectory();
    final localFile = File('${localDir.path}/$assetId');
    await localFile.writeAsBytes(response.bodyBytes);

    // Compute checksum for verification
    final checksum = _sha256(response.bodyBytes);

    // Record in cache repository
    await assetCache.cacheAsset(assetId, version, 'animation', localFile, checksum);

    return localFile;
  }

  /// Background WiFi pre-download for all owned pets
  Future<void> preCacheAllOwnedPets() async {
    // Check if on WiFi
    final connectivityResult = await (Connectivity().checkConnectivity());
    if (connectivityResult != ConnectivityResult.wifi) return;

    // Fetch pet catalog
    final pets = await _fetchMyPets();

    for (final pet in pets) {
      try {
        // Download animation
        await getPetAsset(
          pet.assets.animation.filename,
          pet.assetVersion.toString(),
          pet.assets.animation.cdnUrl,
        );

        // Download audio files
        for (final audio in pet.assets.audio) {
          await getPetAsset(
            audio.filename,
            pet.assetVersion.toString(),
            audio.cdnUrl,
          );
        }
      } catch (e) {
        // Non-blocking: log but continue
        debugPrint('Failed to pre-cache ${pet.name}: $e');
      }
    }
  }

  String _sha256(List<int> bytes) {
    return sha256.convert(bytes).toString();
  }
}
```

#### 1.4 Offline Support

```dart
// pet_loader.dart
Future<void> loadPet(String petId) async {
  try {
    // Try to get from device cache (works offline)
    final file = await assetManager.getPetAsset(petId, version, cdnUrl);
    await riveController.loadAsset(file.path);
  } on SocketException {
    // No internet — check if we have it cached
    final cachedPath = assetCache.getLocalPathIfCached(petId, version);
    if (cachedPath != null) {
      await riveController.loadAsset(cachedPath);
    } else {
      throw Exception('Pet not cached and no internet');
    }
  }
}
```

---

## Layer 2: CloudFront CDN

### 2.1 CloudFront Distribution Setup

Create a CloudFront distribution via AWS Console or Terraform:

```hcl
# infrastructure/terraform/cloudfront.tf
resource "aws_cloudfront_distribution" "pets_cdn" {
  enabled = true
  
  origin {
    domain_name = aws_s3_bucket.pet_assets.bucket_regional_domain_name
    origin_id   = "s3-pet-assets"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.pet_assets_oai.cloudfront_access_identity_path
    }
  }
  
  # Restrict S3 access via OAI (only CloudFront can fetch)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-pet-assets"
    
    # Enable gzip compression
    compress = true
    
    # 30-day cache for immutable assets
    default_ttl = 2592000
    max_ttl     = 31536000
    min_ttl     = 0
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "https-only"
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
    # Or use ACM certificate for pets-cdn.manas360.com
    # acm_certificate_arn = aws_acm_certificate.pet_cdn.arn
  }
  
  price_class = "PriceClass_200"  # India + Asia edges (cheapest tier)
}

# Origin Access Identity (OAI) — allows CloudFront to read S3, blocks direct access
resource "aws_cloudfront_origin_access_identity" "pet_assets_oai" {
  comment = "OAI for pet assets S3 bucket"
}

# S3 bucket policy — only CloudFront can read
resource "aws_s3_bucket_policy" "pet_assets" {
  bucket = aws_s3_bucket.pet_assets.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.pet_assets_oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.pet_assets.arn}/*"
      }
    ]
  })
}

# Output CDN domain
output "pet_cdn_domain" {
  value = aws_cloudfront_distribution.pets_cdn.domain_name
}
```

### 2.2 Environment Configuration

Add to `.env`:

```bash
PET_CDN_URL=https://pets-cdn.manas360.com
AWS_PET_ASSETS_BUCKET=manas360-pet-assets
AWS_PET_ASSETS_REGION=ap-south-1
```

### 2.3 Backend: Generate CDN URLs for Pet Assets

Add to pet catalog service:

```typescript
// backend/src/services/pet-catalog.service.ts
import { env } from '../config/env';

const PET_CDN_URL = process.env.PET_CDN_URL || 'https://pets-cdn.manas360.com';

type AssetMetadata = {
  filename: string;
  cdnUrl: string;
  checksum: string;
  sizeBytes: number;
};

/**
 * Get CDN URL for a pet asset (never S3 direct)
 */
function getCdnUrl(assetType: 'rive' | 'audio' | 'environment' | 'thumbnail', filename: string): string {
  // Rule: All URLs go through pets-cdn.manas360.com, NEVER raw S3
  return `${PET_CDN_URL}/${assetType}/${filename}`;
}

/**
 * Build pet catalog entry with CDN URLs
 */
export async function buildPetCatalogEntry(pet: PetRecord): Promise<PetCatalogResponse> {
  // Fetch asset metadata from DB (includes version, filename, checksum)
  const assets = await prisma.petAsset.findMany({
    where: { petId: pet.id },
  });

  const animationAsset = assets.find(a => a.type === 'animation');
  const audioAssets = assets.filter(a => a.type === 'audio');

  return {
    id: pet.id,
    name: pet.name,
    type: pet.type,
    assetVersion: pet.assetVersion,
    assets: {
      animation: animationAsset ? {
        filename: animationAsset.filename,
        cdnUrl: getCdnUrl('rive', animationAsset.filename),
        checksum: animationAsset.checksum,
        sizeBytes: animationAsset.sizeBytes,
      } : null,
      audio: audioAssets.map(a => ({
        id: a.id,
        filename: a.filename,
        cdnUrl: getCdnUrl('audio', a.filename),
        checksum: a.checksum,
        sizeBytes: a.sizeBytes,
      })),
    },
  };
}

export async function getMyPets(userId: string): Promise<PetCatalogResponse[]> {
  const userPets = await prisma.userPet.findMany({
    where: { userId },
    include: { pet: true },
  });

  return Promise.all(userPets.map(up => buildPetCatalogEntry(up.pet)));
}
```

---

## Layer 3: S3 Storage Housekeeping & Lifecycle

### 3.1 S3 Bucket Structure

```bash
s3://manas360-pet-assets/
├── rive/
│   ├── cat_v1.riv       (status=deprecated → IA after 30d → Glacier after 90d)
│   ├── cat_v2.riv       (status=deprecated)
│   └── cat_v3.riv       (status=current → Standard storage)
├── audio/
│   ├── cat_purr_v1.mp3
│   └── cat_meow_v2.mp3
├── environments/
│   ├── garden_day_v2.riv
│   └── garden_night_v1.riv
└── thumbnails/
    ├── cat_128x128.webp
    └── dog_256x256.webp
```

### 3.2 S3 Tagging Strategy

Every asset is tagged with lifecycle metadata:

```bash
status=current|deprecated|archived
pet_id=pet_xyz
asset_type=animation|audio|environment|thumbnail
version=3
```

### 3.3 S3 Lifecycle Rules

```hcl
# infrastructure/terraform/s3-lifecycle.tf
resource "aws_s3_bucket_lifecycle_configuration" "pet_assets" {
  bucket = aws_s3_bucket.pet_assets.id

  rule {
    id     = "deprecate-to-ia"
    status = "Enabled"
    
    # Move deprecated assets to S3-IA after 30 days (44% cheaper)
    transitions {
      days          = 30
      storage_class = "STANDARD_IA"
      filter {
        tags = {
          status = "deprecated"
        }
      }
    }
  }

  rule {
    id     = "archive-to-glacier"
    status = "Enabled"
    
    # Move archived versions to Glacier after 90 days (85% cheaper than Standard)
    transitions {
      days          = 90
      storage_class = "GLACIER"
      filter {
        tags = {
          status = "archived"
        }
      }
    }
  }

  rule {
    id     = "delete-old-archives"
    status = "Enabled"
    
    # Auto-delete from Glacier after 365 days
    expiration {
      days = 365
      filter {
        tags = {
          status = "archived"
        }
      }
    }
  }
}
```

### 3.4 Asset Versioning & Cleanup in Backend

Add to admin/pet management service:

```typescript
// backend/src/services/pet-asset-management.service.ts
import { S3Client, PutObjectTaggingCommand, GetObjectTaggingCommand } from '@aws-sdk/client-s3';
import { prisma } from '../config/db';

const s3 = new S3Client({ region: env.awsRegion });

/**
 * When artist publishes new pet version:
 * 1. Upload new .riv file as cat_v3.riv with status=current
 * 2. Tag old version (cat_v2.riv) with status=deprecated
 * 3. Update DB pet record with new assetVersion
 */
export async function publishPetVersion(petId: string, newRivFile: Buffer, audioFiles?: Map<string, Buffer>) {
  const pet = await prisma.pet.findUniqueOrThrow({ where: { id: petId } });
  const newVersion = pet.assetVersion + 1;
  
  // Upload new animation file
  const newAnimationFilename = `${pet.slug}_v${newVersion}.riv`;
  await uploadToPetAssetBucket({
    key: `rive/${newAnimationFilename}`,
    body: newRivFile,
    tags: {
      status: 'current',
      pet_id: petId,
      asset_type: 'animation',
      version: newVersion.toString(),
    },
  });

  // Upload audio files if provided
  if (audioFiles) {
    for (const [audioType, buffer] of audioFiles) {
      const audioFilename = `${pet.slug}_${audioType}_v${newVersion}.mp3`;
      await uploadToPetAssetBucket({
        key: `audio/${audioFilename}`,
        body: buffer,
        tags: {
          status: 'current',
          pet_id: petId,
          asset_type: 'audio',
          version: newVersion.toString(),
        },
      });
    }
  }

  // Tag old version as deprecated (lifecycle rules handle migration to IA/Glacier)
  if (pet.assetVersion > 0) {
    const oldAnimationFilename = `${pet.slug}_v${pet.assetVersion}.riv`;
    await tagS3Object({
      key: `rive/${oldAnimationFilename}`,
      tags: {
        status: 'deprecated',
        pet_id: petId,
        asset_type: 'animation',
        version: pet.assetVersion.toString(),
      },
    });
  }

  // Update pet record
  await prisma.pet.update({
    where: { id: petId },
    data: { assetVersion: newVersion },
  });

  return { petId, newVersion, newAnimationFilename };
}

/**
 * Upload file to pet assets bucket with tags
 */
async function uploadToPetAssetBucket(input: {
  key: string;
  body: Buffer;
  tags: Record<string, string>;
}) {
  // Upload object
  await s3.send(new PutObjectCommand({
    Bucket: env.awsS3Bucket,
    Key: input.key,
    Body: input.body,
    ServerSideEncryption: env.awsS3DisableServerSideEncryption ? undefined : 'AES256',
  }));

  // Tag immediately after upload
  const tagSet = Object.entries(input.tags).map(([k, v]) => ({ Key: k, Value: v }));
  await s3.send(new PutObjectTaggingCommand({
    Bucket: env.awsS3Bucket,
    Key: input.key,
    Tagging: { TagSet: tagSet },
  }));
}

/**
 * Tag existing S3 object
 */
async function tagS3Object(input: {
  key: string;
  tags: Record<string, string>;
}) {
  const tagSet = Object.entries(input.tags).map(([k, v]) => ({ Key: k, Value: v }));
  await s3.send(new PutObjectTaggingCommand({
    Bucket: env.awsS3Bucket,
    Key: input.key,
    Tagging: { TagSet: tagSet },
  }));
}
```

---

## Integration with Existing Redis Infrastructure

### 4.1 Cache Catalog Metadata in Redis

Pet catalog (which assets exist, their versions, CDN URLs) changes infrequently. Cache in Redis for 1 hour:

```typescript
// backend/src/services/pet-catalog.service.ts
import { redis } from '../config/redis';

const CATALOG_CACHE_TTL = 3600; // 1 hour

export async function getMyPetsWithCache(userId: string): Promise<PetCatalogResponse[]> {
  const cacheKey = `pet:catalog:${userId}`;
  
  // Try Redis first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss — build from DB
  const pets = await buildMyPetsCatalog(userId);

  // Store in Redis for 1 hour
  await redis.set(cacheKey, JSON.stringify(pets), CATALOG_CACHE_TTL);

  return pets;
}

/**
 * Invalidate pet catalog cache when new version published
 */
export async function invalidatePetCatalogCache(userId: string) {
  await redis.del(`pet:catalog:${userId}`);
}
```

### 4.2 Asset Download Analytics

Track which assets are downloaded (for cost monitoring):

```typescript
// backend/src/middleware/pet-asset-analytics.middleware.ts
import { createClient } from 'redis';
import { env } from '../config/env';

const redis = createClient({ url: env.redisUrl });

/**
 * Track pet asset downloads in Redis for analytics
 */
export async function trackAssetDownload(assetFilename: string) {
  try {
    const key = `pet:asset:downloads:${assetFilename}`;
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${key}:${today}`;
    
    // Increment daily counter
    await redis.incr(dailyKey);
    await redis.expire(dailyKey, 86400 * 30); // 30-day retention
  } catch (e) {
    // Best-effort: don't block on analytics failure
  }
}

/**
 * Get download stats for asset (for CloudFront cache hit monitoring)
 */
export async function getAssetDownloadStats(assetFilename: string, days = 7): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const key = `pet:asset:downloads:${assetFilename}:${dateStr}`;
    
    const count = await redis.get(key);
    stats[dateStr] = count ? parseInt(count) : 0;
  }
  
  return stats;
}
```

### 4.3 Cost Monitoring via Redis

Store billing/cost alerts in Redis:

```typescript
// backend/src/services/pet-cost-monitoring.service.ts
import { redis } from '../config/redis';

/**
 * Set alert threshold for daily S3 bandwidth
 */
export async function setBandwidthAlertThreshold(limitGB: number) {
  await redis.set('pet:cost:bandwidth_alert_gb', String(limitGB));
}

/**
 * Get current month's bandwidth (from CloudWatch or estimated)
 */
export async function getCurrentMonthBandwidth(): Promise<number> {
  // In production: query CloudWatch
  // For now: estimate from Redis counters
  
  const pattern = 'pet:asset:downloads:*';
  // Implementation would sum all daily totals
  return 0.5; // placeholder
}

/**
 * Alert if bandwidth exceeds threshold (send to admin)
 */
export async function checkBandwidthAlerts() {
  const threshold = await redis.get('pet:cost:bandwidth_alert_gb');
  if (!threshold) return;

  const current = await getCurrentMonthBandwidth();
  if (current > parseFloat(threshold)) {
    // Send alert
    console.warn(`Pet assets bandwidth alert: ${current}GB > ${threshold}GB limit`);
  }
}
```

---

## Phase 1 & 2 Implementation Checklist

### Phase 1: Build + Launch (Months 1–3)

**Codebase Changes:**

- [ ] **Backend: Asset versioning schema**
  - [ ] Add `PetAsset` table with (id, petId, filename, version, type, checksum, sizeBytes, status, createdAt)
  - [ ] Add migration: `schema.prisma` entry for `PetAsset` model

- [ ] **Backend: Pet catalog service**
  - [ ] Implement `buildPetCatalogEntry()` with CDN URL generation
  - [ ] Implement `getMyPetsWithCache()` with 1-hour Redis TTL
  - [ ] Implement `invalidatePetCatalogCache()`

- [ ] **Backend: Asset management admin API**
  - [ ] `POST /api/admin/pets/{petId}/publish-version` — upload .riv, audio, publish
  - [ ] `GET /api/admin/assets/stats` — download stats, S3 costs

- [ ] **Backend: S3 lifecycle + CDN**
  - [ ] Create Terraform for CloudFront distribution (pets-cdn.manas360.com)
  - [ ] Create S3 bucket policy (OAI-only access)
  - [ ] Create S3 lifecycle rules (30d → IA, 90d → Glacier, 365d → delete)

- [ ] **Backend: Asset analytics**
  - [ ] Middleware: track CDN downloads in Redis
  - [ ] Service: retrieve 7-day download stats
  - [ ] CloudWatch: monitor CloudFront cache hit ratio

- [ ] **Backend: Environment variables**
  - [ ] Add `PET_CDN_URL`, `AWS_PET_ASSETS_BUCKET`, `AWS_PET_ASSETS_REGION`

- [ ] **Flutter App: Device cache (if applicable)**
  - [ ] SQLite/Hive: `AssetCacheRepository` with version tracking
  - [ ] Asset manager: download → verify checksum → save to device
  - [ ] Background WiFi pre-download for owned pets
  - [ ] Offline playback: check device cache if network unavailable

- [ ] **API Contract: Pet catalog response**
  - [ ] Update `GET /api/pets/my-pets` to include `assetVersion`, `assets.animation.cdnUrl`, `assets.audio[].cdnUrl`

**Infrastructure:**

- [ ] Deploy CloudFront distribution
- [ ] Update S3 bucket policy (OAI-only)
- [ ] Configure S3 lifecycle rules
- [ ] Update DNS: `pets-cdn.manas360.com` → CloudFront CNAME
- [ ] Verify: CloudFront cache hit rate >90%

**Testing:**

- [ ] App opens → loads pet from CDN (first time) → ✅
- [ ] Airplane mode → app loads pet from device → ✅
- [ ] WiFi background pre-download → all owned pets cached → ✅
- [ ] Device cache hit rate >95% after first load → ✅

**Monitoring:**

- [ ] CloudWatch: S3 direct GETs <1/day (should be near-zero)
- [ ] CloudWatch: CloudFront cache hit ratio >90%
- [ ] Redis: `pet:asset:downloads:*` counters tracking
- [ ] Monthly: infra cost <₹1/user (vs ₹17 before)

---

### Phase 2: Optimize + Steady State (Months 4–6)

**Code Optimizations:**

- [ ] Asset compression audit: review all .riv files (target <5 MB each)
- [ ] Audio compression: 128kbps MP3 standard
- [ ] Thumbnail conversion: WEBP format, <50KB each
- [ ] Verify CloudFront gzip compression ratio (~30%)

**Monitoring & Reporting:**

- [ ] CloudFront analytics: cache hit ratio, bandwidth served, cost
- [ ] S3 analytics: lifecycle transitions (Standard → IA → Glacier counts)
- [ ] Cost verification: confirm <₹1/user/month
- [ ] Device cache metrics: cache hit rate, storage usage per user

**SOP Documentation:**

- [ ] Artist uploads new .riv file → new version string
- [ ] Admin panel: create catalog entry with version
- [ ] Automatic: old version tagged deprecated
- [ ] Automatic: lifecycle rules migrate storage tier
- [ ] Quarterly review: cost per user, cache hit rates, storage size

---

## Cost Breakdown (6-Month Projection)

### At 5,000 Users (Tier 2 Only)

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| **S3 GET requests** (0.06/1000 reqs) | ₹254 | ₹4 | 98% |
| **S3 bandwidth** (7.50/GB) | ₹84,000 | ₹0 (device cached) | 100% |
| **CloudFront bandwidth** (0.63/GB) | — | ₹315 | — |
| **S3 storage** (₹6/GB/month) | ₹45 | ₹45 | 0% |
| **Monthly per user** | **₹17.06** | **₹0.33** | **98%** |
| **Annual per user** | ₹204.72 | ₹3.96 | **98%** |

### Tier 2 Revenue vs Infrastructure

- **Revenue:** 5,000 users × ₹99/month = ₹4,95,000/month
- **Infra cost (before):** ₹85,300/month = 17% margin hit
- **Infra cost (after):** ₹1,650/month = 0.3% margin hit
- **Profit recovery:** ₹83,650/month

---

## Redis Integration Summary

| Use Case | Redis Pattern | TTL | Purpose |
|----------|---------------|-----|---------|
| Pet catalog caching | `pet:catalog:{userId}` | 1 hour | Avoid DB hits for asset metadata |
| Daily asset downloads | `pet:asset:downloads:{filename}:{date}` | 30 days | Track CDN/S3 usage for analytics |
| Cost alerts | `pet:cost:bandwidth_alert_gb` | Persistent | Threshold for automated alerts |
| Presence tracking | `session:presence:{sessionId}` | 60 sec (existing) | Already using for sessions |

---

## Deployment Checklist

- [ ] Terraform: apply CloudFront + S3 lifecycle infrastructure
- [ ] Backend: migrations + code + environment variables
- [ ] Flutter: device cache implementation + background pre-download
- [ ] DNS: CNAME `pets-cdn.manas360.com`
- [ ] Testing: device cache, offline playback, CloudFront hits
- [ ] Monitoring: CloudWatch alarms, Redis counters, cost reports
- [ ] Documentation: SOP for new pet releases
- [ ] Validation: cost per user <₹1/month

---

## References

- Original spec: [Digital_Pet_S3_Cache_Optimization_Tier2.md](../Digital_Pet_S3_Cache_Optimization_Tier2.md)
- Backend Redis config: [backend/src/config/redis.ts](../backend/src/config/redis.ts)
- Platform config caching: [backend/src/services/platform-config.service.ts](../backend/src/services/platform-config.service.ts)
- CloudFront docs: https://docs.aws.amazon.com/cloudfront/
- S3 lifecycle: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html

