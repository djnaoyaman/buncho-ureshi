import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(".");
let count = 0;
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (/\.(m?js)$/.test(p)) {
      const c = spawnSync(process.execPath, ["--check", p], {
        encoding: "utf8",
      });
      if (c.status) throw Error(c.stderr);
      count++;
    }
  }
}
await walk(root);
console.log(`${count} JavaScript files passed syntax checks.`);
const { articles } = await import("../src/data/articles.js");
const { photos } = await import("../src/data/photos.js");
const { quizzes } = await import("../src/data/quizzes.js");
if (photos.length < 30)
  throw Error(`Only ${photos.length} photos; initial target is 30`);
if (quizzes.length < 20) throw Error("Need 20+ quizzes");
const ids = new Set();
for (const a of articles) {
  if (ids.has(a.id)) throw Error("Duplicate article " + a.id);
  ids.add(a.id);
  for (const k of ["title", "category", "summary", "body", "deep", "checkedAt"])
    if (!a[k]) throw Error(`${a.id} missing ${k}`);
  if (!a.sources?.length) throw Error(`${a.id} missing sources`);
}
for (const p of photos) {
  for (const k of [
    "id",
    "src",
    "alt",
    "author",
    "source",
    "license",
    "licenseUrl",
  ])
    if (!p[k]) throw Error(`${p.id} missing ${k}`);
  await stat(path.join(root, "public", p.src));
}
for (const a of articles) {
  for (const id of a.photos || [])
    if (!photos.some((p) => p.id === id))
      throw Error(`${a.id} unknown photo ${id}`);
  for (const id of a.related || [])
    if (!ids.has(id)) throw Error(`${a.id} unknown related ${id}`);
}
for (const q of quizzes) {
  if (!ids.has(q.articleId))
    throw Error(`${q.id} missing article ${q.articleId}`);
  if (!Number.isInteger(q.answer) || !q.choices[q.answer])
    throw Error(`${q.id} invalid answer`);
  if (q.photoId && !photos.some((p) => p.id === q.photoId))
    throw Error(`${q.id} missing photo`);
}
console.log(
  `Content validated: ${articles.length} articles, ${photos.length} photos, ${quizzes.length} quizzes.`,
);
