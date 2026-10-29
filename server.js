// Local development/preview server for OG EDIBLES1738 (Supabase version).
//
// Serves the static site and exposes the Netlify functions in-process so the
// page can be exercised locally without a Netlify deploy:
//
//   POST /.netlify/functions/save-data?action=checkout   → order insert + emails
//
// Usage:
//   node server.js [port]
//   → http://localhost:PORT
//
// Set SUPABASE_URL / SUPABASE_SERVICE_KEY / RESEND_* env vars for full function
// behaviour; without them the function endpoints return readable errors.

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = parseInt(process.argv[2] || process.env.PORT, 10) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const FUNCTIONS = {
  "save-data": require("./netlify/functions/save-data.js").handler,
};

const FUNCTION_PREFIX = "/.netlify/functions/";

function readBody(req) {
  return new Promise((resolve) => {
    let chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8") || ""));
  });
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body && typeof body.pipe === "function") {
    body.pipe(res);
  } else {
    res.end(body);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // ── Function routes ────────────────────────────────────────
  if (url.pathname.startsWith(FUNCTION_PREFIX)) {
    const fnName = url.pathname.slice(FUNCTION_PREFIX.length).split("/")[0];
    const handler = FUNCTIONS[fnName];
    if (!handler) {
      send(res, 404, { "Content-Type": "application/json" },
        JSON.stringify({ error: `Unknown function "${fnName}".` }));
      return;
    }
    const rawBody = await readBody(req);
    const event = {
      httpMethod: req.method,
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      body: rawBody || null,
      headers: req.headers,
    };
    try {
      const result = await handler(event);
      send(res, result.statusCode, result.headers || { "Content-Type": "application/json" }, result.body);
    } catch (err) {
      console.error(`[server] function ${fnName} failed:`, err);
      send(res, 500, { "Content-Type": "application/json" },
        JSON.stringify({ error: "Function error.", details: err.message }));
    }
    return;
  }

  // ── Static files ───────────────────────────────────────────
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    send(res, 403, { "Content-Type": "text/plain" }, "Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      send(res, 404, { "Content-Type": "text/html; charset=utf-8" },
        "<h1>404 — Not found</h1><p>Try /index.html, /products.html, /admin.html or /checkout.html</p>");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-cache" }, fs.createReadStream(filePath));
  });
});

server.listen(PORT, () => {
  console.log(`OG EDIBLES1738 preview running at http://localhost:${PORT}`);
  console.log("Functions: /.netlify/functions/save-data");
});