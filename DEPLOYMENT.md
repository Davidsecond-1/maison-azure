# Maison Azure — Deployment Guide

A complete short-let booking platform with admin dashboard, real Paystack payments, and analytics. This guide takes you from zero to deployed in about 30 minutes.

---

## What you're deploying

- **Public site** with hero, gallery (real photos), amenities, working booking form
- **Paystack payment integration** — real money, real verification, real receipts
- **Admin dashboard** at `/admin/dashboard` with bookings, analytics, and editable settings
- **Real database** (Neon Postgres, free tier) storing everything
- **Live analytics** tracking visitors, sources, conversion rates

---

## Prerequisites

You need accounts at these (all have free tiers):

1. **GitHub** — to host your code
2. **Vercel** ([vercel.com](https://vercel.com)) — to deploy
3. **Neon** ([neon.tech](https://neon.tech)) — for the database
4. **Paystack** ([paystack.com](https://paystack.com)) — for payments

Sign up for all four if you haven't.

---

## Step 1 — Push code to GitHub

```bash
cd maison-azure
git init
git add .
git commit -m "Initial commit"
```

Create a new repo on GitHub (e.g. `maison-azure`), then:

```bash
git remote add origin https://github.com/yourusername/maison-azure.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Create Neon Postgres database

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **"Create a project"**, name it `maison-azure`
3. Copy the **connection string** that looks like: `postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require`
4. Save this — you'll need it as `DATABASE_URL`

### Run the schema

In Neon dashboard:
1. Click **"SQL Editor"** in the sidebar
2. Open `schema.sql` from this project, copy everything
3. Paste it in the SQL editor and click **Run**
4. You should see "Success" — all tables created

---

## Step 3 — Get Paystack keys

1. Sign up at [paystack.com](https://paystack.com) and verify your business
2. Go to **Settings → Developers**
3. Copy your **Test Secret Key** (starts with `sk_test_...`) — use this first
4. Once everything works, switch to your **Live Secret Key** (`sk_live_...`)

> **Note:** You can develop and demo with test keys. They simulate payments without taking real money. Switch to live keys only when ready to take real bookings.

---

## Step 4 — Generate JWT secret

Run this in your terminal:

```bash
openssl rand -base64 32
```

Copy the output. This is your `JWT_SECRET`.

---

## Step 5 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**
2. Import the GitHub repo you created
3. Vercel auto-detects Next.js — leave the defaults
4. Click **"Environment Variables"** and add these three:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon connection string |
   | `PAYSTACK_SECRET_KEY` | Your Paystack test/live secret key |
   | `JWT_SECRET` | The random string from step 4 |

5. Click **"Deploy"**

After ~2 minutes, you'll get a URL like `maison-azure-abc123.vercel.app`. Visit it — your site is live.

---

## Step 6 — Create your admin user

Visit this URL **once** in your browser, replacing values:

```
https://YOUR-VERCEL-URL.vercel.app/api/setup?email=you@example.com&password=YourStrongPassword123&name=Owner
```

You'll see `"success": true`. Then go to:

```
https://YOUR-VERCEL-URL.vercel.app/admin/login
```

Login with the credentials you just created. You're in.

> **Security:** the `/api/setup` endpoint will refuse to run a second time once an admin exists.

---

## Step 7 — Test a booking end-to-end

1. Visit your homepage
2. Fill out the booking form, submit
3. You'll be redirected to Paystack
4. Use Paystack's test card:
   - Card: `4084 0840 8408 4081`
   - CVV: `408`
   - Expiry: any future date
   - PIN: `0000`
   - OTP: `123456`
5. After payment, you'll land on the confirmation page
6. Login to `/admin/dashboard` — your booking is there

---

## Step 8 — Custom domain (optional but recommended)

For a professional ₦450k site, you want a custom domain:

1. Buy a domain (e.g. `maisonazure.ng` from `domainking.ng` or `namecheap.com`)
2. In Vercel: **Project → Settings → Domains → Add**
3. Enter your domain, follow Vercel's DNS instructions
4. Done — your site is now at `maisonazure.ng`

---

## Step 9 — Customize for the client

Each new client = a new deployment. Process:

1. Fork this repo to a new GitHub repo (`client-name-site`)
2. Replace photos in `pages/index.tsx` (the `PHOTOS` object at the top) with your client's actual property photos. Upload them to a free image host (Cloudinary, ImageKit, even GitHub) and paste the URLs.
3. Deploy to a new Vercel project
4. Login to admin dashboard, edit all settings (property name, rates, contact info)
5. Hand over admin login to the client

That's it — 2-3 hours per client after the first one.

---

## Going live with real money

When you're ready to accept real payments:

1. In Paystack: complete business verification (NIN + CAC docs)
2. In Vercel: change `PAYSTACK_SECRET_KEY` env var to your **Live** key (`sk_live_...`)
3. Redeploy (Vercel does this automatically on env var change)
4. Test one booking yourself with a real card to verify

---

## Pricing this work to clients

You're charging ₦450,000. Here's how to justify it line by line:

| Component | Standalone Value |
|---|---|
| Custom-designed booking website | ₦200,000 |
| Paystack payment integration | ₦80,000 |
| Admin dashboard with bookings management | ₦100,000 |
| Real-time analytics & insights | ₦50,000 |
| Editable settings without coding | ₦40,000 |
| Custom domain & hosting setup | ₦30,000 |
| Mobile-optimized + WhatsApp click-to-chat | ₦20,000 |
| **Total perceived value** | **₦520,000** |
| **Your price** | **₦450,000** |

Frame it as: "Most agencies charge ₦200k for a website that's just pretty pictures. I deliver a system that takes payments, manages your business, and shows you who's interested."

---

## Troubleshooting

**"Database connection failed"** — Check `DATABASE_URL` is correct, Neon project isn't paused (free tier pauses after inactivity).

**"Payment initialization failed"** — `PAYSTACK_SECRET_KEY` is wrong or you haven't verified your Paystack account.

**Booking goes through but no entry in admin** — Webhooks aren't required for this flow (we verify on callback), but check that the `pages/booking/confirm.tsx` redirect happened correctly.

**"Unauthorized" errors on admin pages** — Cookie wasn't set. Check Vercel deployment is using HTTPS (it is by default).

**Photos look generic** — They are! Replace the `PHOTOS` object in `pages/index.tsx` with your client's actual property photos.

---

## What's NOT included (and what to add later)

This is a single-property booking site, deliberately. To upsell clients in 6 months, you can add:

- Email notifications (SendGrid/Resend) on new bookings — easy
- SMS notifications via Termii — easy
- Multi-property support — moderate (database changes)
- Calendar sync with iCal/Google Calendar — moderate
- Discount codes — moderate
- Guest reviews section — easy

Each is an upsell of ₦100k-200k. Don't promise these in the initial deal — let clients ask.
