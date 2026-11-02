import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const port = Number(process.env.PORT || 4173);
const server = http
  .createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (!p.startsWith("/buncho-ureshi/")) {
        res.writeHead(302, { Location: "/buncho-ureshi/" });
        return res.end();
      }
      p = p.slice("/buncho-ureshi/".length);
      let file = path.resolve(root, p);
      if (!file.startsWith(root + path.sep) && file !== root)
        throw Error("bad path");
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
      const data = await readFile(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".webp": "image/webp",
          ".jpg": "image/jpeg",
          ".png": "image/png",
          ".json": "application/json",
          ".webmanifest": "application/manifest+json",
          ".ico": "image/x-icon",
          ".txt": "text/plain; charset=utf-8",
          ".xml": "application/xml; charset=utf-8",
          ".mp4": "video/mp4",
          ".webm": "video/webm",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(data);
    } catch {
      try {
        const page = await readFile(path.join(root, "404.html"));
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(page);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
      }
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`http://127.0.0.1:${server.address().port}/buncho-ureshi/`),
  );
