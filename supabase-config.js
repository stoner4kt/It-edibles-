// Supabase Configuration for OG EDIBLES1738
// Values from: https://supabase.com/dashboard → Project Settings → API

const supabaseConfig = {
  supabaseUrl: "https://jykljxykvctpzczhdtcu.supabase.co",
  // The anon key is meant to be public. RLS policies in supabase/schema.sql
  // are what actually protect the data.
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5a2xqeHlrdmN0cHpjemhkdGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzk4NjgsImV4cCI6MjEwODg1NTg2OH0.2I1pkxD3g8BufdQzHoBQvRNEwa25EaKxtqZUZiKzW7U"
};

// Cloudinary — admin profile picture uploads (browser, unsigned preset).
// Cloudinary → Settings → Upload → Upload presets → Add unsigned preset.
const cloudinaryConfig = {
  cloudName: "kjs4dmt1",
  uploadPreset: "og_edibles_avatars",
  folder: "og-edibles-avatars"
};

const cloudinaryConfigured =
  !!cloudinaryConfig.cloudName &&
  cloudinaryConfig.cloudName !== "YOUR_CLOUDINARY_CLOUD_NAME" &&
  !!cloudinaryConfig.uploadPreset &&
  cloudinaryConfig.uploadPreset !== "YOUR_UNSIGNED_PRESET";

// Cloudinary — "Our Story" homepage image uploads (browser, unsigned preset).
// Reuses the avatar preset (and its matching folder) so the editor works out
// of the box. To put story photos in their own delivery folder, create a
// dedicated unsigned preset (Cloudinary → Settings → Upload → Upload presets
// → Add unsigned preset, with the folder set inside the preset) and set both
// uploadPreset and folder here to match it. The folder is sent with the
// upload and must match the preset's configured folder or Cloudinary rejects
// the request.
const cloudinaryStoryConfig = {
  cloudName: cloudinaryConfig.cloudName,
  uploadPreset: cloudinaryConfig.uploadPreset,
  folder: cloudinaryConfig.folder
};

const cloudinaryStoryConfigured =
  !!cloudinaryStoryConfig.cloudName &&
  cloudinaryStoryConfig.cloudName !== "YOUR_CLOUDINARY_CLOUD_NAME" &&
  !!cloudinaryStoryConfig.uploadPreset &&
  cloudinaryStoryConfig.uploadPreset !== "YOUR_UNSIGNED_PRESET";

// Pages use this to show a setup hint instead of a generic network error.
const supabaseConfigured =
  !!supabaseConfig.supabaseUrl && !!supabaseConfig.supabaseAnonKey;

// Initialize Supabase client. The name must not be `supabase`: the CDN bundle
// already defines that global, and a top-level `const supabase` would throw
// "Identifier 'supabase' has already been declared".
var supabaseClient = (() => {
  if (window.supabase && window.supabase.createClient) {
    try {
      return window.supabase.createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey);
    } catch (e) {
      console.error("Supabase init failed:", e);
      throw e;
    }
  }
  throw new Error("Supabase client library not loaded. Include the supabase-js CDN script before supabase-config.js.");
})();

// ─────────────────────────────────────────────
// SETUP INSTRUCTIONS
// ─────────────────────────────────────────────
// 1. Create a Supabase project at https://supabase.com
// 2. Open SQL Editor and paste + run supabase/schema.sql
// 3. Add your project URL + anon key above
// 4. Create an admin user: Authentication → Users → Add user
//    Then run:
//      INSERT INTO public.profiles (id, email, is_admin)
//      VALUES ('<user-uuid>', '<admin-email>', true);
// 5. Confirm the `product-images` bucket was created by the schema
//    (Storage → Buckets → product-images). If not, create it manually
//    as a public bucket with a 5 MB file limit.
// 6. Set these environment variables on Netlify:
//    | SUPABASE_URL             | Project Settings → API → Project URL  |
//    | SUPABASE_SERVICE_KEY     | Project Settings → API → service_role (SECRET – never expose it in the browser) |
//    | RESEND_API_KEY           | https://resend.com → API Keys        |
//    | ORDER_NOTIFY_EMAILS      | Comma-separated addresses that receive new-order emails (e.g. admin@ogedibles.com) |
//    | RESEND_FROM_EMAIL        | Verified sender, e.g. OG EDIBLES1738 <orders@yourdomain.com> |
// ─────────────────────────────────────────────
