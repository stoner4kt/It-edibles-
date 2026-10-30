// netlify/functions/save-data.js
//
// Netlify Function for OG EDIBLES1738 (Supabase backend):
//
//   POST /save-data?action=checkout
//     Body: { orderId, customerName, totalAmount, items[], whatsapp, email, address, notes }
//     → Inserts the order into Supabase `orders`
//     → Sends a confirmation email to the customer (if they supplied an email)
//     → Sends a new-order notification to the shop via Resend
//     The WhatsApp/Instagram payment flow is untouched — the customer still
//     downloads the PDF receipt and sends it to WhatsApp / Instagram.
//
// Required Netlify environment variables:
//   SUPABASE_URL            – Project Settings → API → Project URL
//   SUPABASE_SERVICE_KEY    – Project Settings → API → service_role (SECRET)
//   RESEND_API_KEY          – https://resend.com → API Keys
//   RESEND_FROM_EMAIL       – Verified sender (e.g. OG EDIBLES1738 <orders@yourdomain.com>)
//   ORDER_NOTIFY_EMAILS     – Comma-separated shop addresses for new-order emails

const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const respond = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key)
    throw new Error("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getResend() {
  if (!process.env.RESEND_API_KEY)
    throw new Error("Missing RESEND_API_KEY.");
  return new Resend(process.env.RESEND_API_KEY);
}

// The Resend SDK resolves to { data, error } instead of throwing, so callers
// must check `error` themselves. This wrapper turns failures into exceptions
// so the checkout flow can report a warning without losing the order.
async function sendEmail(payload) {
  const { data, error } = await getResend().emails.send(payload);
  if (error) throw new Error(error.message || "Resend rejected the message.");
  return data;
}

const formatItemsForEmail = (items) =>
  (items || [])
    .map((i) => `${i.name} × ${i.qty} @ R${i.price} = R${Number(i.price) * Number(i.qty || 0)}`)
    .join("\n");

const formatItemsForHtml = (items) =>
  (items || [])
    .map((i) => `<tr><td>${escapeHtml(i.name)}</td><td>${Number(i.qty) || 0}</td><td>R${Number(i.price)}</td><td>R${(Number(i.price) * Number(i.qty || 0)).toFixed(2)}</td></tr>`)
    .join("");

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── Emails (Resend) ───────────────────────────────────────────────────────

async function sendNewOrderEmail({ orderId, customerName, totalAmount, whatsapp, email, address, notes, items }) {
  const recipients = (process.env.ORDER_NOTIFY_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!recipients.length) {
    console.warn("[Resend] ORDER_NOTIFY_EMAILS not set; skipping admin email.");
    return;
  }

  const subject = `🛒 New order ${orderId} — R${Number(totalAmount).toFixed(2)}`;
  const text =
    `New order received.\n\n` +
    `Order: ${orderId}\n` +
    `Customer: ${customerName}\n` +
    `Total: R${Number(totalAmount).toFixed(2)}\n` +
    `WhatsApp: ${whatsapp || "–"}\n` +
    `Email: ${email || "–"}\n` +
    `Address: ${address || "–"}\n` +
    `Notes: ${notes || "–"}\n\n` +
    `Items:\n${formatItemsForEmail(items)}`;

  const html =
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">` +
    `<h2 style="color:#1E4D2B">New order received</h2>` +
    `<p><b>Order:</b> ${orderId}</p>` +
    `<p><b>Customer:</b> ${escapeHtml(customerName)}</p>` +
    `<p><b>Total:</b> R${Number(totalAmount).toFixed(2)}</p>` +
    `<p><b>WhatsApp:</b> ${escapeHtml(whatsapp) || "–"}</p>` +
    `<p><b>Email:</b> ${escapeHtml(email) || "–"}</p>` +
    `<p><b>Address:</b> ${escapeHtml(address) || "–"}</p>` +
    `<p><b>Notes:</b> ${escapeHtml(notes) || "–"}</p>` +
    `<table style="border-collapse:collapse;width:100%">` +
    `<tr style="background:#E5F3E7"><th style="text-align:left;padding:6px">Item</th><th style="padding:6px">Qty</th><th style="padding:6px">Price</th><th style="padding:6px">Total</th></tr>` +
    formatItemsForHtml(items) +
    `</table></div>`;

  const failures = [];
  for (const to of recipients) {
    try {
      await sendEmail({ from: process.env.RESEND_FROM_EMAIL, to, subject, text, html });
      console.log(`[Resend] Admin notification sent to ${to}`);
    } catch (err) {
      console.warn(`[Resend] Failed to notify ${to}:`, err.message);
      failures.push(`${to}: ${err.message}`);
    }
  }
  if (failures.length === recipients.length) {
    throw new Error(`All admin notifications failed (${failures.join("; ")})`);
  }
}

async function sendCustomerConfirmation({ orderId, customerName, email, totalAmount, items }) {
  if (!email) return;
  const subject = `Order received — ${orderId}`;
  const text =
    `Hi ${customerName},\n\n` +
    `Thank you! Your order ${orderId} (total R${Number(totalAmount).toFixed(2)}) has been received.\n\n` +
    `Items:\n${formatItemsForEmail(items)}\n\n` +
    `We will confirm your order via WhatsApp after payment. Keep your receipt handy.`;

  const html =
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">` +
    `<div style="background:#1E4D2B;padding:18px;border-radius:10px 10px 0 0">` +
    `<h2 style="color:#fff;margin:0">OG EDIBLES1738</h2></div>` +
    `<div style="border:1px solid #eee;border-top:none;padding:18px;border-radius:0 0 10px 10px">` +
    `<h3 style="color:#1E4D2B">Order received — ${orderId}</h3>` +
    `<p>Hi ${escapeHtml(customerName)},</p>` +
    `<p>Thanks for your order! We've saved it and will confirm the payment + delivery via WhatsApp.</p>` +
    `<p><b>Total:</b> R${Number(totalAmount).toFixed(2)}</p>` +
    `<table style="border-collapse:collapse;width:100%">` +
    `<tr style="background:#E5F3E7"><th style="text-align:left;padding:6px">Item</th><th style="padding:6px">Qty</th><th style="padding:6px">Total</th></tr>` +
    formatItemsForHtml(items) +
    `</table>` +
    `<p style="margin-top:16px;color:#666;font-size:13px">Send your receipt or order number to WhatsApp or Instagram @ogedibles1738 to arrange payment and delivery.</p>` +
    `</div></div>`;

  await sendEmail({ from: process.env.RESEND_FROM_EMAIL, to: email, subject, text, html });
  console.log(`[Resend] Customer confirmation sent to ${email}`);
}

// ─── Checkout ──────────────────────────────────────────────────────────────

async function handleCheckout(data) {
  const { orderId, customerName, totalAmount, items = [], whatsapp = "", email = "", address = "", notes = "" } = data;
  const errors = [];
  if (!orderId) errors.push("'orderId' is required.");
  if (!customerName?.trim()) errors.push("'customerName' is required.");
  if (totalAmount === undefined || isNaN(Number(totalAmount))) errors.push("'totalAmount' must be a number.");
  if (errors.length) return respond(400, { error: "Validation failed.", details: errors });

  let dbId;
  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("orders")
      .insert({
        order_id: orderId,
        customer_name: String(customerName).trim(),
        total_amount: Number(totalAmount),
        items,
        whatsapp: String(whatsapp).trim(),
        email: String(email).trim(),
        address: String(address).trim(),
        notes: String(notes).trim(),
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    dbId = row.id;
    console.log("[Supabase] Order saved:", dbId);
  } catch (err) {
    console.error("[Supabase] Failed to save order:", err);
    return respond(502, { error: "Failed to save order.", details: err.message });
  }

  const warnings = [];
  try {
    await sendNewOrderEmail({ orderId, customerName, totalAmount, whatsapp, email, address, notes, items });
  } catch (err) {
    warnings.push(`Admin email failed: ${err.message}`);
    console.warn("[Resend] Admin email", err.message);
  }
  try {
    await sendCustomerConfirmation({ orderId, customerName, email, totalAmount, items });
  } catch (err) {
    warnings.push(`Customer email failed: ${err.message}`);
    console.warn("[Resend] Customer email", err.message);
  }

  const body = { message: "Order placed.", orderId };
  if (dbId) body.dbId = dbId;
  if (warnings.length) {
    body.warning = "Order saved but one or more emails could not be sent.";
    body.warnings = warnings;
  }
  return respond(200, body);
}

// ─── Main Handler ──────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return respond(405, { error: "Method not allowed. Use POST." });

  const action = (event.queryStringParameters || {}).action;
  if (!action) return respond(400, { error: "Missing ?action= parameter.", hint: "Use ?action=checkout" });

  let body;
  try {
    body = JSON.parse(event.body);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Body must be a JSON object.");
  } catch (err) {
    return respond(400, { error: "Invalid body: " + err.message });
  }

  if (action === "checkout") return handleCheckout(body);
  return respond(400, { error: `Unknown action: "${action}".`, hint: "Valid: checkout" });
};
