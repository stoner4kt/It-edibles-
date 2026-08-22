// netlify/functions/save-data.js
//
// Dual-purpose Netlify Function for OG EDIBLES1738:
//
//   POST /save-data?action=upload-product
//     Body: { name, price, stock, [category], [description], image (Base64) }
//     → Uploads image to Cloudinary, saves product to Firestore `products`
//
//   POST /save-data?action=checkout
//     Body: { orderId, customerName, totalAmount, items[], whatsapp, email, address, notes }
//     → Saves order to Firestore `orders`,
//       appends row to Google Sheet (non-fatal if it fails)
//
// Required Netlify environment variables:
//   SERVICE_ACCOUNT_JSON          – { project_id, client_email, private_key }
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
//   GOOGLE_SHEET_ID               – (optional) for order logging to Sheets
//
// Legacy vars also supported: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
//   FIREBASE_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY

const admin      = require("firebase-admin");
const cloudinary = require("cloudinary").v2;
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT }               = require("google-auth-library");

// ─── Helpers ───────────────────────────────────────────────────────────────

const fixKey = (raw) => (raw ? raw.replace(/\\n/g, "\n") : undefined);

let parsedServiceAccount = null;

function getServiceAccount() {
  if (parsedServiceAccount) return parsedServiceAccount;
  if (process.env.SERVICE_ACCOUNT_JSON) {
    try {
      const creds = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
      parsedServiceAccount = {
        projectId:   creds.project_id,
        clientEmail: creds.client_email,
        privateKey:  fixKey(creds.private_key),
      };
      return parsedServiceAccount;
    } catch (err) {
      throw new Error(`Invalid SERVICE_ACCOUNT_JSON: ${err.message}`);
    }
  }
  parsedServiceAccount = {
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey:  fixKey(process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY),
  };
  return parsedServiceAccount;
}

const respond = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ─── Firebase ──────────────────────────────────────────────────────────────

function getFirebaseApp() {
  if (admin.apps.length > 0) return admin.apps[0];
  const { projectId, clientEmail, privateKey } = getServiceAccount();
  if (!projectId || !clientEmail || !privateKey)
    throw new Error("Missing Firebase credentials. Set SERVICE_ACCOUNT_JSON.");
  return admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
}

// ─── Cloudinary ────────────────────────────────────────────────────────────

function getCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)
    throw new Error("Missing Cloudinary env vars.");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

async function uploadToCloudinary(base64, folder) {
  const cld = getCloudinary();
  const dataUri = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`;
  const result = await cld.uploader.upload(dataUri, { resource_type: "image", folder });
  return result.secure_url;
}

// ─── Google Sheets ─────────────────────────────────────────────────────────

const SHEET_HEADERS = ["Order_ID","Customer_Name","Total_Amount","Timestamp"];

async function appendOrderToSheet({ orderId, customerName, totalAmount }) {
  const { clientEmail, privateKey } = getServiceAccount();
  if (!process.env.GOOGLE_SHEET_ID || !clientEmail || !privateKey) return;
  const auth = new JWT({ email: clientEmail, key: privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  let hasHeaders = false;
  try { await sheet.loadHeaderRow(); hasHeaders = !!(sheet.headerValues?.length); } catch { hasHeaders = false; }
  if (!hasHeaders) await sheet.setHeaderRow(SHEET_HEADERS);
  await sheet.addRow({ Order_ID: orderId||"", Customer_Name: customerName||"", Total_Amount: totalAmount||"", Timestamp: new Date().toISOString() });
}

// ─── Route A: Product Upload ───────────────────────────────────────────────

async function handleProductUpload(data) {
  const { name, price, stock, category = "", description = "", image } = data;
  const errors = [];
  if (!name?.trim()) errors.push("'name' is required.");
  if (price === undefined || isNaN(Number(price))) errors.push("'price' must be a number.");
  if (stock === undefined || isNaN(parseInt(stock))) errors.push("'stock' must be an integer.");
  if (!image) errors.push("'image' is required.");
  if (errors.length) return respond(400, { error: "Validation failed.", details: errors });

  let imageUrl;
  try {
    imageUrl = await uploadToCloudinary(image, "og-edibles-products");
    console.log("[Cloudinary] Uploaded:", imageUrl);
  } catch (err) {
    console.error("[Cloudinary]", err.message);
    return respond(502, { error: "Image upload failed.", details: err.message });
  }

  let docId;
  try {
    getFirebaseApp();
    const db = admin.firestore();
    const ref = await db.collection("products").add({
      name: name.trim(), price: Number(price), stock: parseInt(stock),
      category: category.trim(), description: description.trim(),
      imageUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    docId = ref.id;
    console.log("[Firestore] Product saved:", docId);
  } catch (err) {
    console.error("[Firestore]", err.message);
    return respond(502, { error: "Failed to save product.", details: err.message });
  }

  return respond(200, { message: "Product uploaded.", productId: docId, imageUrl });
}

// ─── Route B: Checkout ─────────────────────────────────────────────────────

async function handleCheckout(data) {
  const { orderId, customerName, totalAmount, items=[], whatsapp="", email="", address="", notes="" } = data;
  const errors = [];
  if (!orderId) errors.push("'orderId' is required.");
  if (!customerName?.trim()) errors.push("'customerName' is required.");
  if (totalAmount === undefined || isNaN(Number(totalAmount))) errors.push("'totalAmount' must be a number.");
  if (errors.length) return respond(400, { error: "Validation failed.", details: errors });

  let firestoreId;
  try {
    getFirebaseApp();
    const db = admin.firestore();
    const ref = await db.collection("orders").add({
      orderId,
      customerName: String(customerName).trim(),
      totalAmount: Number(totalAmount),
      items,
      whatsapp: String(whatsapp).trim(),
      email:    String(email).trim(),
      address:  String(address).trim(),
      notes:    String(notes).trim(),
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    firestoreId = ref.id;
    console.log("[Firestore] Order saved:", firestoreId);
  } catch (err) {
    console.error("[Firestore]", err.message);
    return respond(502, { error: "Failed to save order.", details: err.message });
  }

  let sheetsWarning = null;
  try {
    await appendOrderToSheet({ orderId, customerName, totalAmount });
    console.log("[Sheets] Row appended for:", orderId);
  } catch (err) {
    sheetsWarning = err.message;
    console.warn("[Sheets] Non-fatal:", err.message);
  }

  const body = { message: "Order placed.", firestoreId, orderId };
  if (sheetsWarning) body.warning = "Order saved; Sheets sync failed.";
  return respond(200, body);
}

// ─── Main Handler ──────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return respond(405, { error: "Method not allowed. Use POST." });

  const action = (event.queryStringParameters || {}).action;
  if (!action) return respond(400, { error: "Missing ?action= parameter.", hint: "Use ?action=upload-product or ?action=checkout" });

  let body;
  try {
    body = JSON.parse(event.body);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Body must be a JSON object.");
  } catch (err) {
    return respond(400, { error: "Invalid body: " + err.message });
  }

  switch (action) {
    case "upload-product": return handleProductUpload(body);
    case "checkout":       return handleCheckout(body);
    default: return respond(400, { error: `Unknown action: "${action}".`, hint: "Valid: upload-product, checkout" });
  }
};
