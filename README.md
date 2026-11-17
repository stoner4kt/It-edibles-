# 🌿 OG EDIBLES1738 – Website v3

A complete cannabis e-commerce website with a **Supabase** backend, **Resend** transactional
email, admin panel, and proof-of-payment order flow. Built with the OG EDIBLES1738 branding
(white/green/purple).

**Orders are still confirmed over WhatsApp.** The checkout flow is unchanged: the customer
places the order, a PDF receipt downloads, and they send it to WhatsApp/Instagram with their
order number. Supabase stores the order; Resend notifies the shop and the customer.

---

## 📁 File Structure

```
og-edibles-1738/
├── index.html              → Homepage (hero, featured products, reviews, about)
├── products.html           → Full product catalogue with cart drawer
├── checkout.html           → Order form + PDF receipt download
├── admin.html              → Admin dashboard (Supabase auth + is_admin profile flag)
├── supabase-config.js      → Supabase URL + anon key (EDIT THIS FIRST)
├── supabase/schema.sql     → Tables, RLS policies, triggers, storage bucket
├── server.js               → Local preview server (static files + functions)
├── netlify.toml            → Netlify build config
├── netlify/functions/
│   ├── save-data.js        → Checkout: order insert + Resend emails
│   └── package.json
├── supabase/migration-profile-avatar.sql → Adds profiles.avatar_url + display_name to existing projects
├── supabase/migration-site-content.sql   → Adds site_content (Our Story editing) to existing projects
└── images/                 → All product and brand images
```

---

## 🚀 Quick Setup

### Step 1: Create the Supabase project
1. Go to https://supabase.com/dashboard → New project
2. Copy the **Project URL** and **anon public key** from Project Settings → API

### Step 2: Create the schema
Open the Supabase **SQL Editor**, paste the whole of `supabase/schema.sql`, and run it.

This creates:
- `products`, `orders`, `reviews`, `profiles` tables
- Row Level Security policies (public read for products/reviews, admin-only for orders)
- The `public.is_admin()` helper and `profiles` auto-creation trigger
- The `product-images` storage bucket

The script is idempotent — safe to run again.

### Step 3: Set the anon key in `supabase-config.js`
```js
supabaseUrl:     "https://YOUR-PROJECT-REF.supabase.co",
supabaseAnonKey: "YOUR-ANON-PUBLIC-KEY"
```
While these are placeholders the site renders a "Supabase isn't configured yet" hint
instead of failing silently.

### Step 4: Create the admin user
1. Supabase → Authentication → Users → **Add user** (email + password)
2. Copy the new user's UUID, then run in the SQL Editor:
```sql
INSERT INTO public.profiles (id, email, is_admin)
VALUES ('<user-uuid>', '<admin-email>', true)
ON CONFLICT (id) DO UPDATE SET is_admin = true;
```
The admin panel signs in with email + password (magic link is available as a fallback) and
then verifies `profiles.is_admin` server-side before showing anything.

### Step 5: Netlify environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Project Settings → API → `service_role` (**secret**, never in the browser) |
| `RESEND_API_KEY` | https://resend.com → API Keys |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `OG EDIBLES1738 <orders@yourdomain.com>` |
| `ORDER_NOTIFY_EMAILS` | Comma-separated addresses that receive new-order emails |

Emails are best-effort: if Resend fails, the order is still saved and the response returns a
`warnings` array so the failure is visible instead of silent.

---

## 🧪 Running locally

```bash
# static site + Netlify functions in one process
node server.js 3000
# → http://localhost:3000
```

For full checkout behaviour, export `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ORDER_NOTIFY_EMAILS` before starting.

---

## 📄 Pages Overview

### Homepage (`index.html`)
- Age verification gate (21+)
- Hero section with CTA
- Featured products loaded from Supabase (latest 6)
- Customer reviews — view + submit
- About / Our Story section
- Footer with social links

### Products (`products.html`)
- Full product catalogue from Supabase
- Filter by category (Edibles, Flower, Pre-rolls, Drinks, etc.)
- Add to cart with quantity controls
- Cart drawer with totals

### Checkout (`checkout.html`)
- Order summary with cart items
- Customer details form (name, WhatsApp, email, address)
- Order saved to Supabase via the `save-data` Netlify function
- **PDF receipt auto-downloaded** after ordering
- Success overlay with WhatsApp / Instagram handoff instructions

### Admin Panel (`admin.html`)
Access at: `yoursite.com/admin.html`

- Sign in with Supabase email/password (must have `is_admin = true`)
- **Overview:** stats (products, orders, revenue) + recent orders
- **Products:** view all, update stock inline, edit/delete
- **Orders:** view all, filter by status, update status
- **Add Product:** upload a new product with image to the `product-images` bucket
- **Our Story:** edit the homepage "Our Story" image (uploaded to Cloudinary) and blog/paragraphs, saved in `site_content`

---

## 🗄️ Database schema

| Table | Purpose | Access |
|-------|---------|--------|
| `products` | Catalogue | public read, admin write |
| `orders` | Placed orders (items stored as JSONB) | admin only |
| `reviews` | Customer reviews | public read + insert, admin moderation |
| `profiles` | One row per auth user, holds `is_admin` | own row read, admin all |
| `site_content` | Homepage "Our Story" (image_url + blog paragraphs) | public read, admin write |

`is_admin()` is `SECURITY DEFINER` so RLS policies can check the flag without recursing into
the `profiles` policies.

---

## 🎨 Brand Colours

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#1E4D2B` | Dark forest green — headings, nav, buttons |
| `secondary` | `#E5F3E7` | Light mint green — backgrounds, cards |
| `accent` | `#A56CFF` | Purple — CTAs, badges, highlights |
| `text-dark` | `#333333` | Main body text |
| `text-mid` | `#6B7280` | Secondary / muted text |

---

## 🚢 Deploying

### Netlify
1. Push to GitHub
2. Connect the repo to Netlify
3. Set the environment variables from Step 5
4. Deploy — `netlify.toml` installs the function dependencies and publishes the site

---

## 🔧 Customisation

### WhatsApp number
The number lives in the page markup as `wa.me/27637572748`. Update it in `index.html`,
`products.html`, and `checkout.html` if it changes.

### Adding product categories
Edit the `<select>` in `admin.html` (Add Product tab) and the filter buttons in `products.html`.

### Receipt footer
In `checkout.html` → `generateReceiptPdf()` → update the WhatsApp number and Instagram handle.
