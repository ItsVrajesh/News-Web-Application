import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dist = resolve(root, "dist");
const portArg = process.argv.find((arg) => arg.startsWith("--port="));
const port = Number(process.env.PORT || portArg?.slice(7) || 5173);
const categories = new Set(["general", "business", "technology", "science", "health", "sports", "entertainment"]);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon" };
const cache = new Map();

function readLocalEnv() {
  try {
    const lines = readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/);
    return Object.fromEntries(lines.map((line) => {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      return match ? [match[1], match[2].replace(/^['"]|['"]$/g, "")] : [];
    }).filter((item) => item.length === 2));
  } catch {
    return {};
  }
}
const env = { ...readLocalEnv(), ...process.env };
const apiKey = env.NEWS_API_KEY || env.VITE_APP_NEWS_API_KEY;

function json(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

async function news(requestUrl, response) {
  const category = requestUrl.searchParams.get("category") || "general";
  const page = Number(requestUrl.searchParams.get("page") || 1);
  if (!categories.has(category) || !Number.isInteger(page) || page < 1 || page > 100) return json(response, 400, { message: "Invalid news section or page." });
  if (!apiKey) return json(response, 503, { message: "Add NEWS_API_KEY to the local .env file to load headlines." });

  const key = `${category}:${page}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return json(response, 200, cached.data);

  try {
    const upstreamUrl = new URL("https://newsapi.org/v2/top-headlines");
    upstreamUrl.search = new URLSearchParams({ country: "us", category, page: String(page), pageSize: "12" }).toString();
    const upstream = await fetch(upstreamUrl, { headers: { "X-Api-Key": apiKey }, signal: AbortSignal.timeout(12000) });
    const data = await upstream.json();
    if (!upstream.ok || data.status !== "ok") return json(response, upstream.status >= 400 ? upstream.status : 502, { message: data.message || "The news provider is unavailable." });
    const result = { totalResults: data.totalResults || 0, articles: Array.isArray(data.articles) ? data.articles.map(({ title, description, content, url, urlToImage, publishedAt, source }) => ({ title, description, content, url, urlToImage, publishedAt, source: { name: source?.name || "News source" } })) : [] };
    cache.set(key, { data: result, expires: Date.now() + 5 * 60 * 1000 });
    return json(response, 200, result);
  } catch {
    return json(response, 502, { message: "We could not reach the news provider. Please try again shortly." });
  }
}

async function serveFile(pathname, response) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  let filePath;
  try {
    filePath = resolve(dist, "." + decodeURIComponent(requested));
  } catch {
    return json(response, 400, { message: "Invalid path." });
  }
  if (!filePath.startsWith(dist + sep) && filePath !== dist) return json(response, 403, { message: "Forbidden." });
  try {
    const target = (await stat(filePath)).isFile() ? filePath : resolve(dist, "index.html");
    const bytes = await readFile(target);
    response.writeHead(200, { "Content-Type": mime[extname(target)] || "application/octet-stream", "Cache-Control": target.includes(`${sep}assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache", "X-Content-Type-Options": "nosniff" });
    response.end(bytes);
  } catch {
    if (extname(pathname)) return json(response, 404, { message: "File not found." });
    try {
      const bytes = await readFile(resolve(dist, "index.html"));
      response.writeHead(200, { "Content-Type": mime[".html"], "Cache-Control": "no-cache" });
      response.end(bytes);
    } catch {
      json(response, 503, { message: "Build the frontend with npm run build first." });
    }
  }
}

createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/api/health") return json(response, 200, { status: "ok" });
  if (url.pathname === "/api/news") return news(url, response);
  return serveFile(url.pathname, response);
}).listen(port, "localhost", () => {
  process.stdout.write(`NewsVruva is ready at http://localhost:${port}/\n`);
});
