# 🌿 OG EDIBLES1738 – Website v2

A complete cannabis e-commerce website with Firebase backend, admin panel, and proof-of-payment order flow. Built with the OG EDIBLES1738 branding (white/green/purple) and full functionality from the Herbal Heights architecture.

---

## 📁 File Structure

```
og-edibles-1738/
├── index.html              → Homepage (hero, featured products from Firebase, reviews, about)
├── products.html           → Full product catalogue with cart drawer
├── checkout.html           → Order form + PDF receipt download
├── admin.html              → Admin dashboard (password-protected)
├── firebase-config.js      → Firebase configuration (EDIT THIS FIRST)
├── netlify.toml            → Netlify build config
├── netlify/functions/
│   ├── save-data.js        → Backend: product upload + order save
│   └── package.json
└── images/                 → All product and brand images
```

---

## 🚀 Quick Setup

### Step 1: Firebase Project
1. Go to https://console.firebase.google.com
2. Create project → register Web app → copy `firebaseConfig`

### Step 2: Update `firebase-config.js`
Replace placeholder values with your Firebase credentials.

### Step 3: Enable Firebase Services
- **Firestore Database** → Create database (test mode)
- **Storage** → Get started (test mode)
- **Authentication** → Enable Email/Password

### Step 4: Create Admin Account
1. Firebase Console → Authentication → Add user (email + password)
2. Copy the UID shown
3. Firestore → Add collection `admins` → Document ID = your UID → `{ isAdmin: true }`

### Step 5: Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /orders/{doc}   { allow read: if request.auth != null; allow create: if true; }
    match /reviews/{doc}  { allow read: if true; allow create: if true; allow write: if request.auth != null; }
    match /admins/{doc}   { allow read, write: if request.auth != null; }
  }
}
```

### Step 6: Storage Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} { allow read, write: if true; }
  }
}
```

### Step 7: Netlify Environment Variables
In Netlify dashboard → Site Settings → Environment Variables, add:

| Variable | Description |
|----------|-------------|
| `SERVICE_ACCOUNT_JSON` | Full Firebase service account JSON (from Project Settings → Service Accounts) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GOOGLE_SHEET_ID` | (Optional) Google Sheet ID for order logging |

### Step 8: Update Contact Details
Find and replace in all HTML files:
- `27000000000` → your WhatsApp number (with country code, no +)
- `0700000000` → your local WhatsApp number
- `@ogedibles1738` → your Instagram handle

---

## 📄 Pages Overview

### Homepage (`index.html`)
- Age verification gate (21+)
- Hero section with CTA
- Featured products loaded from Firebase (latest 6)
- Customer reviews — view + submit from Firebase
- About / Our Story section
- Footer with social links

### Products (`products.html`)
- Full product catalogue from Firebase
- Filter by category (Edibles, Flower, Pre-rolls, Drinks, etc.)
- Add to cart with quantity controls
- Cart drawer with totals
- Proceed to checkout button

### Checkout (`checkout.html`)
- Order summary with cart items
- Customer details form (name, WhatsApp, email, address)
- Order saved to Firestore via Netlify function
- **PDF receipt auto-downloaded** after order placed
- Success overlay with contact instructions

### Admin Panel (`admin.html`)
Access at: `yoursite.com/admin.html`

- Login with Firebase email/password (must be in `admins` collection)
- **Overview:** Stats (products, orders, revenue) + recent orders
- **Products:** View all, update stock inline, edit/delete
- **Orders:** View all, filter by status, update status
- **Add Product:** Upload new products with image (via Cloudinary) + all details

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

### Netlify (Recommended)
1. Push to GitHub
2. Connect repo to Netlify
3. Set environment variables (see Step 7)
4. Deploy — the `netlify.toml` handles the rest

### Manual drag-and-drop
1. Drag the folder to https://app.netlify.com/drop
2. Note: Netlify functions won't work without environment variables set

---

## 🔧 Customisation

### Adding Product Categories
Edit the `<select>` in `admin.html` (Add Product tab) and the filter buttons in `products.html`.

### WhatsApp Link
Change `wa.me/27000000000` throughout all pages to your real number.

### Receipt Footer
In `checkout.html` → `generateReceiptPdf()` → update WhatsApp number and Instagram handle.
