# Village Rewards

**Spend-based QR loyalty PWA for Melbourne independent village traders.**

Built by Gardener & Son. Part of the **Incentives layer** in the G&S system spine:

**Culture → Discovery → Registry → Incentives**

---

## What Village Rewards Is

Village Rewards is a tiered reward marketplace where customers earn points across all village merchants and unlock merchant-donated rewards at specific point milestones. 

This is NOT a discount pooling system. Each merchant voluntarily donates specific rewards at specific tiers, and only pays when customers redeem their specific reward.

**Core mechanics:**
- $1 spent = 1 point earned
- Fixed tiers: 10, 20, 30, 50, 100 points
- Customer chooses which merchant's reward to redeem
- Points reset to 0 after redemption
- Merchant controls their own reward strategy

---

## Current State

**Status:** Functional MVP — auth implemented in code, pending Supabase configuration

**What works:**
- Customer registration, QR code generation, points dashboard
- Trader login flow — pilot code fetched from Supabase `pilot_config` table (not hardcoded)
- Admin dashboard with D3 network graphs, heatmaps, analytics
- Supabase Auth (email magic link) implemented for admin
- Service worker for offline fallback
- Supabase backend (PostgreSQL + realtime)

**Pending Supabase configuration (before auth flows are live):**
- Admin: create `admin_users` table, enable Email provider, add redirect URL (see `docs/SECURITY.md`)
- Trader: create `pilot_config` table, insert `trader_pilot_code` row (see `docs/SECURITY.md`)

**In development:**
- Tiered redemption system (replacing current prototype model)
- Merchant reward donation marketplace
- Multi-village expansion

---

## Documentation Structure

### Core Documentation
- **Engineering brief:** `AGENTS.md` - current state, tech stack, next steps
- **G&S universal context:** `SUPER_MIND.md` - the operating system for all G&S properties
- **AI instructions:** `AI_CONTEXT.md` - quick-start companion to SUPER_MIND

### Technical Documentation (`/docs/`)
- **Schema:** `docs/SCHEMA.md` - full Supabase database schema
- **Architecture:** `docs/ARCHITECTURE.md` - tech stack, deployment, data flow
- **Security:** `docs/SECURITY.md` - auth state, RLS policies, implementation plan
- **Tiered System:** `docs/TIERED-SYSTEM.md` - new redemption model specification
- **Current System:** `docs/CURRENT-SYSTEM.md` - how the existing prototype works

---

## G&S Context: Incentives Layer

Village Rewards sits in the **Incentives** stage of the G&S spine:

1. **Culture** - Studio work, gardens, Heirloom, Field Guide → creates desire
2. **Discovery** - Find My EVC, Find My Ecological Garden → creates knowledge
3. **Registry** - Ecological Registry → creates trust
4. **Incentives** - Village Rewards, Yield → creates value

Village Rewards is the first commercial test of the Incentives layer - proving that collective loyalty mechanics can activate local economies while generating economic intelligence for councils.

---

## Design Standard

Village Rewards follows the G&S visual system:

- **Palette:** `#3d4535` green, `#fff0dc` beige, `#a8c285` accent
- **Typography:** Abril Fatface (headings), IBM Plex Sans (body)
- **Principle:** Border-radius 0 everywhere (registry, not consumer product)
- **Voice:** Calm, grounded, systems-aware

The Village Rewards landing page is the approved design reference for all G&S web products.

---

## Quick Start

**For engineers:**
1. Read `AGENTS.md` for current state and tech stack
2. Read `docs/SCHEMA.md` for database structure
3. Read `docs/SECURITY.md` for auth implementation requirements
4. Read `docs/TIERED-SYSTEM.md` for next build phase

**For AI assistants:**
1. Read `AI_CONTEXT.md` for G&S voice and principles
2. Read `SUPER_MIND.md` for the full operating context
3. Read `AGENTS.md` for repo-specific engineering detail

---

## Next Steps

**Immediate (Phase 1):**
- Implement Supabase Auth (email magic link for admin, trader accounts)
- Document RLS policies and implement in Supabase
- Fix PWA manifest (Android install currently broken)

**Development (Phase 2):**
- Build tiered redemption system per `docs/TIERED-SYSTEM.md`
- Merchant reward donation marketplace
- Council analytics dashboard

**Scale (Phase 3):**
- Multi-village support
- Cross-village point accumulation
- Advanced economic intelligence layer

---

## Contact

Built by Gardener & Son  
Mont Albert & Auburn Road, Hawthorn  
Melbourne, Victoria

For G&S system context, see `SUPER_MIND.md`
