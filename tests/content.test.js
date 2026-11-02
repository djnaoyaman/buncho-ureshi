import test from "node:test";
import assert from "node:assert/strict";
import { articles } from "../src/data/articles.js";
import { photos } from "../src/data/photos.js";
import { quizzes } from "../src/data/quizzes.js";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
test("encyclopedia has every required section and three learning levels", () => {
  for (const c of [
    "文鳥ってどんな鳥",
    "からだ探検",
    "いろんな文鳥",
    "しぐさ研究所",
    "文鳥と暮らす",
  ])
    assert.ok(
      articles.some((a) => a.category === c),
      c,
    );
  for (const a of articles) {
    assert.ok(a.body.length > 45, a.id);
    assert.ok(a.deep.length > 45, a.id);
    assert.ok(
      a.sources.every(
        (s) =>
          /^https:\/\//.test(s.url) ||
          s.title === "ご家族からの制作依頼書（2026年11月2日）",
      ),
      a.id,
    );
  }
});
test("30 licensed local photographs have distinct file content", async () => {
  assert.ok(photos.length >= 30);
  const hashes = [];
  for (const p of photos) {
    assert.match(p.src, /^\/photos\/[a-zA-Z0-9_.-]+$/);
    assert.ok(p.author && p.source && p.license && p.licenseUrl && p.credit);
    const buf = await readFile(new URL("../public" + p.src, import.meta.url));
    assert.ok(buf.length > 1000);
    hashes.push(createHash("sha256").update(buf).digest("hex"));
  }
  assert.equal(new Set(hashes).size, hashes.length);
});
test("20+ quizzes link explanations to real articles", () => {
  assert.ok(quizzes.length >= 20);
  for (const q of quizzes) {
    assert.ok(articles.some((a) => a.id === q.articleId));
    assert.ok(q.explanation.length > 12);
    assert.ok(q.choices.length >= 2);
    assert.ok(q.answer >= 0 && q.answer < q.choices.length);
  }
  assert.ok(
    quizzes.some((q) => q.photoId || q.diagram),
    "need visual questions",
  );
});
test("real Omochi remains separate from fictional biographies", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("本人の写真と観察エピソードは未提供"));
  assert.ok(app.includes("ゲームの出来事とは別の記録"));
});
