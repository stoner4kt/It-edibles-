// Supabase Configuration for OG EDIBLES1738
// ⚠️ IMPORTANT: Replace these values with your own Supabase project credentials
// Get them from: https://supabase.com/dashboard → Your Project → Settings → API

const supabaseConfig = {
  // Project URL + anon key. The anon key is safe for browsers because RLS
  // policies (supabase/schema.sql) enforce what anonymous users can do.
  //
  // Replace both values with your own project's credentials:
  //   Supabase Dashboard → Project Settings → API
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabaseAnonKey: "YOUR-ANON-PUBLIC-KEY"
};

// True until the two values above are replaced. Pages use this to show a
// setup hint instead of a generic network error.
const supabaseConfigured =
  !supabaseConfig.supabaseUrl.includes("YOUR-PROJECT-REF") &&
  !supabaseConfig.supabaseAnonKey.includes("YOUR-ANON-PUBLIC-KEY");

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