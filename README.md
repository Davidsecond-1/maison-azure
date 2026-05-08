# Maison Azure — Luxury Short-Let Booking Platform

A complete booking system for premium short-let apartments in Nigeria. Built for resale to apartment owners at ₦450,000 per deployment.

## Features

- 🏠 **Public booking site** with editorial design, real photos, mobile-responsive
- 💳 **Paystack integration** — real payments with verification
- 🔐 **Admin dashboard** at `/admin/dashboard` — manage bookings, view analytics, edit content
- 📊 **Real analytics** — page views, sources, conversions, revenue tracking
- 🗄️ **Real database** — Neon Postgres free tier
- ⚙️ **No-code editing** — owners change copy/rates from dashboard, no developer needed

## Tech Stack

- **Next.js 14** (Pages Router, TypeScript)
- **Neon Postgres** (serverless, free tier)
- **Paystack** (payment processing)
- **Vercel** (hosting, free tier)

## Quick Start

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete deploy walkthrough — about 30 minutes from zero to live site.

## Architecture

```
pages/
  index.tsx                ← Public homepage
  booking/confirm.tsx      ← Post-payment confirmation
  admin/login.tsx          ← Admin login
  admin/dashboard.tsx      ← Owner console
  api/
    bookings.ts            ← Create/list bookings
    bookings/[id].ts       ← Update/delete booking
    paystack/init.ts       ← Initialize payment
    paystack/verify.ts     ← Verify payment
    availability.ts        ← Check available dates
    analytics.ts           ← Track + retrieve analytics
    settings.ts            ← Site settings CRUD
    login.ts               ← Admin auth
    logout.ts
    setup.ts               ← First-time admin creation
lib/
  db.ts                    ← Database client + helpers
  auth.ts                  ← JWT + bcrypt
schema.sql                 ← Database schema
```

## Customization Per Client

1. Replace photo URLs in `pages/index.tsx` (`PHOTOS` object)
2. Deploy to new Vercel project
3. Owner edits everything else from `/admin/dashboard`

That's it. Each client deployment takes ~2 hours.

## License

You own this code. Resell to clients freely.
