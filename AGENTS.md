# AGENTS.md - Village Rewards Engineering Brief

**Repository:** `github.com/tinyforests/villagerewards`  
**Last Updated:** May 2026  
**Status:** Functional MVP, auth disabled, tiered system in development

---

## Purpose

Village Rewards is a spend-based QR loyalty platform for independent village traders. Part of the Gardener & Son **Incentives layer** - proving collective loyalty mechanics can activate local economies while generating economic intelligence for councils.

---

## Current State

### What Works

**Customer Flow:**
- Registration via QR code
- Point accumulation ($1 = 1 point)
- Points dashboard with transaction history
- QR code generation for earning points
- Redemption flow (currently simplified model)

**Trader Flow:**
- Shop selection interface
- Point issuance via customer QR scan
- Transaction recording
- **Currently disabled** - hardcoded PIN removed (see Security)

**Admin Dashboard:**
- Realtime activity feed
- D3 force-directed network graph (cross-shop customer journeys)
- Cross-pollination matrix
- Heatmap by hour/day
- Badge system (6 badge types)
- Customer/transaction tables with sorting
- **Currently disabled** - hardcoded password removed (see Security)

### What's Disabled

**Admin Authentication:**
- Hardcoded password (`GSADMIN2026`) removed from client-side JS
- Login now returns: "Admin login is currently disabled. Contact the site administrator."
- **Why:** Client-side password comparison is not real authentication

**Trader Authentication:**
- Hardcoded PIN (`MONT`) removed from client-side JS
- Login now returns: "Trader login is temporarily disabled. Contact Tyson at G&S."
- **Why:** Same security issue as admin

**GPS Enforcement:**
- `DEV_MODE` was set to `true` (bypassed 150m radius check globally)
- **Now fixed:** `DEV_MODE = false` - GPS enforcement active
- Check-ins now require actual proximity to shop location

### Security Fixes (Committed May 2026)

**Commit:** `c89dca0` - "Security: Remove hardcoded credentials, enable GPS enforcement"

**Changes:**
1. Removed `ADMIN_PW` variable from `village-rewards-admin.html`
2. Removed `TRADER_PIN` variable from `app.html`
3. Set `DEV_MODE = false` in `app.html`
4. Added explicit blocking messages to both login flows
5. Added TODO comments for Supabase Auth implementation

**Result:** Public GitHub repo no longer exposes authentication credentials. Admin and trader flows intentionally disabled until proper auth implemented.

---

## Tech Stack

### Frontend
- **Framework:** None - pure static HTML/CSS/JS
- **Deployment:** GitHub Pages (villagerewards.com.au)
- **Build process:** Zero - edit HTML, commit, push, live in ~30 seconds
- **PWA:** Service worker exists (`sw.js`), but no `manifest.json` (Android install broken)

### Backend
- **Database:** Supabase PostgreSQL
- **Project:** `hwtwfhvaeczofqktychc.supabase.co`
- **Client:** `@supabase/supabase-js@2` (loaded via CDN)
- **Auth:** None currently (pending implementation)

### Dependencies (CDN-loaded)
- `@supabase/supabase-js@2` - database client
- `qrcodejs@1.0.0` - QR code generation
- `d3@7.8.5` - admin dashboard visualizations
- Google Fonts: Abril Fatface + IBM Plex Sans

### File Structure (Flat)
```
villagerewards/
├── index.html                 # Marketing landing page (48KB)
├── app.html                   # Live PWA - customer + trader app (60KB)
├── village-rewards-admin.html # Admin dashboard (60KB)
├── village-rewards-pwa.html   # DEAD CODE - localStorage prototype
├── ma-presentation.html       # Mont Albert trader pitch deck (32KB)
├── sw.js                      # Service worker (3KB)
├── CNAME                      # villagerewards.com.au
├── SUPER_MIND.md             # G&S universal context
├── AI_CONTEXT.md             # G&S AI instructions
├── CLAUDE.md                 # This repo's mirror
├── AGENTS.md                 # This file
└── docs/                     # Technical documentation
```

---

## Data Model

**See `docs/SCHEMA.md` for complete schema documentation.**

### Core Tables (Supabase)

**customers:**
- `id` (6-char alphanumeric)
- `name`, `email`, `points`, `postcode`, `birth_year`
- `created_at`

**shops:**
- `id`, `name`, `active` (boolean)
- `lat`, `lng` (for GPS check-in validation)

**transactions:**
- `customer_id`, `shop_id`, `shop_name`
- `type` (purchase/checkin/redeem/bonus)
- `amount`, `points`
- `created_at`

### Database Views

**village_stats** - top-level aggregate (customers, points, spend, checkins)  
**customer_stats** - per-customer rollup (unique shops, total spend)  
**shop_stats** - per-shop aggregates (transactions, unique customers)  
**cross_pollination** - cross-shop journey pairs + counts  
**checkins_detail** - full checkin records with shop info  
**shop_checkin_summary** - per-shop checkin aggregates

### Points Logic (Current Prototype)

- **Earning:** $1 spent = 1 point
- **Valuation:** 100 points = $1 value
- **Check-ins:** 8 points per GPS-verified visit
- **Check-in cooldown:** 4 hours per shop
- **Redemption:** Currently simplified (will be replaced by tiered system)

---

## Code Quality Issues

### Critical (Addressed)
✅ Hardcoded admin password - **REMOVED**  
✅ Hardcoded trader PIN - **REMOVED**  
✅ DEV_MODE bypassing GPS checks - **FIXED**

### High Priority (Not Yet Addressed)
❌ **No database schema in repo** - entire schema lives only in Supabase  
❌ **No RLS policies documented** - security depends on invisible Supabase config  
❌ **Dead file:** `village-rewards-pwa.html` should be removed or archived  
❌ **No PWA manifest** - Android install broken (sw.js references missing icons)  
❌ **Design tokens duplicated** - CSS custom properties re-declared in 4 files

### Medium Priority
- Non-atomic redemption logic (concurrent redemptions could double-spend)
- Generic git commit messages (no information about what changed)
- No tests, no CI/CD
- Customer-facing error message: "Contact Tyson at G&S"

---

## Security Model

### Current Security Posture

**Supabase Anon Key:**
- Exposed in client-side JS (intentional - it's a public key)
- Security depends entirely on **Row-Level Security (RLS) policies** in Supabase
- **Problem:** RLS policies are not documented in this repo

**Authentication:**
- Admin: Currently disabled (hardcoded password removed)
- Trader: Currently disabled (hardcoded PIN removed)
- Customer: Email-based registration (no password)

**See `docs/SECURITY.md` for full security audit and implementation plan.**

### Required Next Steps

1. **Document RLS policies** - extract from Supabase, document in `docs/SCHEMA.md`
2. **Implement Supabase Auth:**
   - Admin: Email magic link or SSO
   - Trader: Email + password accounts with shop assignment
3. **Test RLS policies** - verify customers can't access other customers' data
4. **Implement server-side validation** - move business logic out of client JS

---

## Deployment

### Current Flow
1. Edit HTML files locally
2. Commit to `main` branch
3. GitHub automatically deploys to Pages
4. Live at `villagerewards.com.au` in ~30 seconds

### No Build Process
- No `package.json`, no bundler, no transpilation
- Supabase credentials embedded directly in JS (anon key only)
- No environment variables

### Custom Domain
- CNAME file points to `villagerewards.com.au`
- DNS managed externally

---

## Next Development Phase: Tiered Redemption System

**See `docs/TIERED-SYSTEM.md` for full specification.**

### Overview

Replace the current simplified redemption model with a **tiered reward marketplace**:

- Fixed tiers: 10, 20, 30, 50, 100 points
- Merchants donate specific rewards at specific tiers
- Customers choose which reward to redeem
- Points reset to 0 after redemption
- Merchants only pay when their specific reward is redeemed

### New Tables Required

**tiers** (static configuration):
- tier_level (10, 20, 30, 50, 100)
- points_required
- suggested_value_min/max

**rewards:**
- merchant_id
- tier_id
- reward_title, reward_description
- estimated_value
- monthly_redemption_cap
- is_active

**redemptions:**
- customer_id
- merchant_id (where redeemed)
- reward_id (specific reward)
- tier_id
- points_spent
- redemption_code (QR validation)
- status (pending/validated/cancelled)

### Development Sequence

1. **Schema migration** - create new tables in Supabase
2. **Merchant dashboard** - reward creation/management UI
3. **Customer tier browser** - show available rewards per tier
4. **QR flows** - earning QR (add points) vs redemption QR (validate reward)
5. **Redemption validation** - merchant confirms customer redemption
6. **Points reset logic** - after successful redemption
7. **Analytics update** - merchant + council dashboards

---

## G&S System Integration

### Position in the Spine

**Culture → Discovery → Registry → Incentives**

Village Rewards is the **Incentives layer** - proving that verified ecological work (Registry) can translate into economic value through collective activation mechanics.

### Design Standard

**Palette:**
- Gardener Green: `#3d4535`
- Nostalgic Beige: `#fff0dc`
- Accent Green: `#a8c285`

**Typography:**
- Abril Fatface (headings, ceremonial moments)
- IBM Plex Sans (body, interface)
- IBM Plex Mono (data, timestamps)

**Principles:**
- Border-radius 0 everywhere (registry, not consumer product)
- Signal Green functional, not decorative
- Calm, grounded, systems-aware voice

**Reference:** The Village Rewards landing page is the approved design reference for all G&S web products.

---

## Testing Checklist (Before Re-enabling Auth)

### Security
- [ ] RLS policies documented and tested
- [ ] Supabase Auth implemented (admin + trader)
- [ ] Customer data isolation verified
- [ ] Server-side validation for critical operations

### Functionality
- [ ] Customer registration flow
- [ ] Point accumulation
- [ ] QR code generation (earning)
- [ ] Trader point issuance
- [ ] Redemption flow
- [ ] Admin dashboard access

### PWA
- [ ] Create `manifest.json`
- [ ] Add icon assets to `/icons/`
- [ ] Test Android "Add to Home Screen"
- [ ] Verify service worker caching

### Data Integrity
- [ ] Concurrent redemption handling
- [ ] Point balance consistency
- [ ] Transaction atomicity
- [ ] GPS check-in cooldown enforcement

---

## Open Questions

### Technical
- Should we migrate to a proper build process (Vite/Next.js)?
- Should we keep the flat HTML architecture or modularize?
- How do we handle schema migrations going forward?
- Should we add TypeScript for type safety?

### Product
- Multi-village expansion timeline?
- Cross-village point accumulation strategy?
- Council dashboard priority features?
- Merchant onboarding automation?

### G&S Integration
- How does Village Rewards data feed back to the Registry?
- Can registered gardens receive Village Rewards benefits?
- Should stewards get loyalty perks?
- How does this connect to Yield economic layer?

---

## Contact & Handoff

**Built by:** Gardener & Son  
**Location:** Mont Albert & Auburn Road, Hawthorn, Melbourne  
**Primary contact:** Tyson (co-founder)

**For new developers:**
1. Read this file (AGENTS.md) first
2. Read `SUPER_MIND.md` for G&S context
3. Read `docs/SCHEMA.md` for database structure
4. Read `docs/SECURITY.md` for security requirements
5. Read `docs/TIERED-SYSTEM.md` for next build phase

**For AI assistants:**
1. Read `AI_CONTEXT.md` for voice and principles
2. Read `SUPER_MIND.md` for full operating context
3. Consult this file for repo-specific engineering detail
