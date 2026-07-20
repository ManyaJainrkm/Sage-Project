/**
 * Production server entry for self-hosted / Node-platform deploys.
 *
 * `vite build` emits two things: static client assets in dist/client, and an
 * SSR fetch handler in dist/server/server.js (default export `{ fetch }`).
 * This entry serves the static assets first and falls through to the SSR
 * handler for everything else, then listens on PORT. Managed platforms
 * (Vercel/Netlify) wire this up themselves; a plain Node host needs it.
 *
 *   npm run build && npm start
 */
import { serve } from "srvx";
import { readFile, stat } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import serverHandler from "./dist/server/server.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const CLIENT_DIR = join(ROOT, "dist", "client");
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

/** Serve a file from dist/client if the request path maps to one; else null. */
async function tryStatic(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const pathname = normalize(decodeURIComponent(new URL(request.url).pathname));
  // Reject path traversal; the SSR handler owns "/".
  if (pathname.includes("..") || pathname === "/" || pathname === "") return null;

  const filePath = join(CLIENT_DIR, pathname);
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) return null;
    const ext = filePath.slice(filePath.lastIndexOf("."));
    const body = await readFile(filePath);
    const immutable = pathname.startsWith("/assets/");
    return new Response(body, {
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      },
    });
  } catch {
    return null;
  }
}

serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(request) {
    return (await tryStatic(request)) ?? serverHandler.fetch(request);
  },
});

console.log(`Sage production server listening on http://0.0.0.0:${String(PORT)}`);
