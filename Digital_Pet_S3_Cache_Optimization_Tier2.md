# Digital Pet — S3 & Cache Cost Optimization (Tier 2 Focus)
## Keeping Tier 2 Interactive Pets at 98%+ Margin

**Scope:** Tier 2 Interactive Pets only (₹99/month). No AI API calls, no Claude, no TTS/STT — everything runs locally on device. The only server costs are S3 asset storage/delivery and periodic stats sync.

**Problem:** Without caching, every app open fetches pet .riv files directly from S3. At 10K users that's ₹1.68L/month in bandwidth alone — 17% of revenue gone.

**Solution:** Cache once on device, serve misses via CDN, never hit S3 directly.

---

## The Fix: 3 Layers

```
User opens app → Device has the file? → YES → Load locally (₹0)
                                       → NO  → CloudFront CDN serves it (₹0.63/GB)
                                               → CDN has it? → YES → Done
                                                              → NO  → S3 origin (₹7.50/GB)
```

**After implementation, 95%+ of requests cost ₹0. The remaining 5% cost 92% less than today.**

---

## Layer 1: Device-Side Caching

Pet animation files (.riv) don't change after release. A cat animation published today is the same cat animation next month. This means the device can download once and keep forever — until you publish a new version.

**How it works:**
- First time user opens a pet → downloads from CDN → saves to device storage
- Every subsequent open → loads from device → zero network cost
- You publish a pet update → bump version in catalog API (e.g., cat_v2 → cat_v3) → device sees new version → downloads once → cached again
- When on WiFi → app silently pre-downloads all owned pet assets in background

**Version naming convention:**
```
cat_v3.riv       (current version — cached on device)
cat_v2.riv       (old version — auto-deleted from device when v3 arrives)
dog_v2.riv
owl_v1.riv
garden_day_v2.riv (environment asset)
cat_purr_v1.mp3   (audio asset — same caching pattern)
```

**Device storage budget:** ~20-50 MB per user (10 pets × 2-5 MB each). Acceptable for any modern smartphone.

**What this eliminates:**
- Daily S3 GET requests: from ~5/user/day → ~0
- Daily bandwidth: from 15 MB/user/day → 0
- Mobile data usage for pet assets: zero (WiFi pre-download)
- Offline dependency: fully works without internet

---

## Layer 2: CloudFront CDN

For the few times device cache misses (first install, new pet purchase, asset update), serve via CloudFront instead of direct S3.

**Setup:**
```
CDN domain:     pets-cdn.manas360.com
Origin:         s3://manas360-pet-assets (ap-south-1 Mumbai)
Cache TTL:      30 days (assets are immutable)
Compression:    Enabled (gzip — .riv files compress ~30%)
HTTPS:          Required
Access:         S3 bucket locked — only accessible via CloudFront (OAI)
Price class:    PriceClass_200 (India + Asia edges — cheapest tier that covers your users)
```

**Cost comparison per GB:**
| Route | Cost |
|-------|------|
| Direct S3 → Device | ₹7.50/GB |
| CloudFront → Device | ₹0.63/GB |
| Device cache → Device | ₹0 |

**Rule: The Flutter app NEVER uses a raw S3 URL. Every asset URL points to pets-cdn.manas360.com.**

---

## Layer 3: S3 Storage Housekeeping

Storage cost is tiny (₹6/month for 760 MB) but keeping it clean avoids accumulation over time.

**Bucket structure:**
```
s3://manas360-pet-assets/
├── rive/           ← pet animation files (.riv)
├── audio/          ← pet sounds (.mp3)
├── environments/   ← background scenes (.riv)
└── thumbnails/     ← catalog thumbnails (.webp)
```

**Lifecycle rules:**
- Current assets (tagged `status=current`): S3 Standard
- Deprecated versions (tagged `status=deprecated`): Move to S3-IA after 30 days (44% cheaper storage)
- Archived old versions (tagged `status=archived`): Move to Glacier after 90 days (85% cheaper)

**Tagging workflow:** When Chandu publishes a new pet version (cat_v3.riv), the old version (cat_v2.riv) gets tagged `status=deprecated` via the admin panel. Lifecycle rules handle the rest automatically.

---

## Cost Projections: Tier 2 Only

### Per-User Monthly Cost

| Component | Without Optimization | With Optimization |
|-----------|---------------------|-------------------|
| S3 GET requests | ₹0.06 | ₹0.001 |
| S3 bandwidth | ₹16.80 | ₹0 (device cached) |
| CloudFront (first install only, amortized) | — | ₹0.03 |
| Stats sync (1 REST call every 30 min) | ₹0.30 | ₹0.30 |
| FCM push notifications (3/day) | ₹0 | ₹0 |
| S3 storage (per-user share) | ₹0.001 | ₹0.001 |
| **Total per user/month** | **₹17.16** | **₹0.33** |

### At Scale

| Users | Revenue (₹99 × users) | Infra Cost (Before) | Infra Cost (After) | Margin |
|-------|----------------------|---------------------|-------------------|--------|
| 1,000 | ₹99,000 | ₹17,160 | ₹330 | **99.7%** |
| 5,000 | ₹4,95,000 | ₹85,800 | ₹1,650 | **99.7%** |
| 10,000 | ₹9,90,000 | ₹1,71,600 | ₹3,300 | **99.7%** |

**Tier 2 is nearly pure profit once device caching is in place.** The only recurring cost is stats sync (₹0.30/user/month) which is negligible.

---

## 6-Month Operations Roadmap (2 Phases)

### Phase 1: Build + Launch (Months 1–3)

**Asset naming + CDN + device caching — all in place before users touch the app.**

- All pet .riv files include version suffix: `{pet}_{version}.riv`. Audio and environments follow the same pattern. Catalog API returns `asset_version` field for each pet.
- CloudFront distribution live: origin s3://manas360-pet-assets, domain pets-cdn.manas360.com, OAI configured (S3 blocks direct access), 30-day cache TTL, gzip compression enabled, PriceClass_200 (India + Asia edges).
- Flutter app caches on device: first pet load downloads from CDN → saves locally. Every subsequent load serves from device (₹0). Old versions auto-pruned when new version detected.
- WiFi pre-download enabled: when device connects to WiFi, app silently pre-caches all owned pet assets in background. Mobile data never used for pet assets.
- CloudWatch alerts configured: S3 direct GETs >100/day (should be near-zero), CloudFront origin spikes (high cache miss), monthly cost report for S3 + CloudFront combined.
- S3 lifecycle rules activated: tag current assets `status=current`, deprecated versions auto-transition to S3-IA after 30 days, archived to Glacier after 90 days.
- First bucket cleanup: tag anything not in current catalog as deprecated, remove test/draft assets.

**Phase 1 exit check:** Open app, load pet, go airplane mode, reopen — pet loads instantly. Device cache hit rate >95%. CloudFront cache hit rate >90%. S3 direct hits <1%. Infra cost <₹1/user/month.

---

### Phase 2: Optimize + Steady State (Months 4–6)

**Squeeze asset sizes, verify costs, lock the new pet release SOP.**

- Asset size audit: review all .riv files (any >5 MB? optimize in Rive), compress audio to 128kbps MP3, convert thumbnails to WebP. Target: average pet bundle <3 MB.
- CloudFront compression validation: confirm gzip Content-Encoding header on .riv files. Target: 30% compression ratio.
- Bandwidth audit: pull CloudFront analytics (total transferred, cache hit ratio, top assets). Pull S3 analytics — any direct access leaks? Compare actual cost vs. projection.
- CDN tuning: if cache hit rate <90%, check for query strings breaking cache keys or TTL set too short.
- Cost verification: confirm Tier 2 infra cost <₹1/user/month. If higher, identify which component is over budget and fix.
- New pet release SOP documented and tested: Artist uploads .riv to S3 via admin panel → file named with new version → admin panel creates catalog entry with CDN URL → old version auto-tagged deprecated → users' devices detect new version on next open → download once → cached. Lifecycle rules handle storage cleanup automatically.
- Quarterly review checklist set: total S3 storage size, CloudFront monthly cost, device cache hit rate, S3 direct access count (should be zero), cost per Tier 2 user.

**Phase 2 exit check:** Cost per user confirmed <₹1/month. New pet release SOP tested end-to-end. Quarterly review checklist running. Team knows the one rule: *Flutter app never uses a raw S3 URL — everything goes through pets-cdn.manas360.com.*

---

## Summary: What Changes

| Before | After |
|--------|-------|
| Every app open fetches from S3 | Download once, cache on device forever |
| Raw S3 URLs in Flutter app | CloudFront CDN URLs everywhere |
| No version tracking on assets | Version suffix in every filename |
| Old pet versions accumulate in S3 Standard | Auto-tiered to IA → Glacier |
| ₹17/user/month infra cost | ₹0.33/user/month infra cost |
| 83% margin at scale | **99.7% margin at scale** |
