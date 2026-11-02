import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { articles } from "../src/data/articles.js";
import { quizzes } from "../src/data/quizzes.js";
import { photos } from "../src/data/photos.js";

test("integrated DOM navigation, learning tools, quiz and truthful observation flows", async () => {
  const window = new Window({
    url: "https://djnaoyaman.github.io/buncho-ureshi/",
    settings: {
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
    },
  });
  const spoken = [];
  window.speechSynthesis = {
    cancel: () => spoken.push("stop"),
    speak: (u) => spoken.push(u.text),
  };
  window.SpeechSynthesisUtterance = class {
    constructor(t) {
      this.text = t;
    }
  };
  for (const key of [
    "window",
    "document",
    "location",
    "history",
    "navigator",
    "localStorage",
    "matchMedia",
    "Image",
    "FormData",
    "SpeechSynthesisUtterance",
  ])
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value:
        key === "window"
          ? window
          : typeof window[key] === "function" && ["matchMedia"].includes(key)
            ? window[key].bind(window)
            : window[key],
    });
  globalThis.speechSynthesis = window.speechSynthesis;
  window.document.write(
    await readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
  );
  window.localStorage.setItem("buncho-favorites", '{"invalid":"shape"}');
  await import("../src/app.js?dom-smoke");
  const doc = window.document;
  assert.equal(
    doc.querySelector("main h1").textContent,
    "文鳥♬文鳥♬文鳥って嬉しいな♪",
  );
  assert.ok(
    doc
      .querySelector(".hero-photo img")
      .getAttribute("src")
      .includes("/buncho-ureshi/photos/"),
  );
  const navigate = (route) => {
    const link = doc.createElement("a");
    link.href = "/buncho-ureshi/" + route;
    doc.body.append(link);
    link.click();
    link.remove();
  };
  navigate("encyclopedia/");
  assert.equal(doc.querySelectorAll(".article-card").length, articles.length);
  const input = doc.querySelector("#article-search");
  input.value = "水浴";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.ok(doc.querySelectorAll(".article-card").length > 0);
  doc.querySelector(".article-card").click();
  assert.ok(location.pathname.includes("/encyclopedia/"));
  for (const a of doc.querySelectorAll(".article-toc a"))
    assert.equal(new URL(a.href).pathname, location.pathname);
  assert.equal(doc.querySelector('a[href=""]'), null);
  doc.querySelector("#favorite").click();
  assert.equal(
    doc.querySelector("#favorite").getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(doc.querySelector("#ruby-toggle"), null);
  assert.equal(doc.documentElement.dataset.ruby, "on");
  doc.querySelector("#speak").click();
  assert.ok(spoken.some((s) => s.includes("文鳥")));
  assert.ok(spoken.every((s) => !s.includes("<ruby>")));
  navigate("body/");
  doc.querySelector('[data-part="ear"]').click();
  assert.ok(doc.querySelector("#part-detail").textContent.includes("耳"));
  navigate("encyclopedia/omochi/");
  assert.equal(doc.querySelectorAll('a[href=""]').length, 0);
  assert.ok(doc.querySelector(".source-box").textContent.includes("ご家族"));
  navigate("omochi/");
  assert.ok(
    doc
      .querySelector("main")
      .textContent.includes("本人の写真と観察エピソードは未提供"),
  );
  const form = doc.querySelector("#observation-form");
  form.querySelector("[name=note]").value =
    "試験用メモ <script>不実行</script>";
  form.requestSubmit();
  assert.ok(
    doc.querySelector("#observations").textContent.includes("試験用メモ"),
  );
  assert.equal(doc.querySelector("#observations script"), null);
  doc.querySelector("[data-delete-note]").click();
  assert.ok(
    doc
      .querySelector("#observations")
      .textContent.includes("まだ記録はありません"),
  );
  navigate("challenge/");
  for (const q of quizzes) {
    doc.querySelector(`[data-answer="${q.answer}"]`).click();
    assert.ok(
      doc.querySelector("#quiz-feedback").textContent.includes("そのとおり"),
    );
    doc.querySelector("#quiz-next").click();
  }
  assert.ok(
    doc
      .querySelector("#quiz-root")
      .textContent.includes(`${quizzes.length} / ${quizzes.length}`),
  );
  navigate("encyclopedia/voice/");
  assert.ok(doc.querySelector("video[controls]"));
  assert.equal(doc.querySelector("video").autoplay, false);
  navigate("credits/");
  assert.equal(doc.querySelectorAll(".credits-grid img").length, 42);
  assert.equal(doc.querySelectorAll('a[href=""]').length, 0);
  navigate("help/");
  doc.querySelector("#motion-toggle").checked = false;
  doc.querySelector("#motion-toggle").dispatchEvent(new window.Event("change"));
  assert.equal(doc.documentElement.dataset.motion, "off");
  doc.querySelector("#menu-toggle").click();
  assert.equal(doc.querySelector("#menu").hidden, false);
  doc.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.equal(doc.querySelector("#menu").hidden, true);
  navigate("not-a-page/");
  assert.ok(
    doc
      .querySelector("main")
      .textContent.includes("この場所にはページがありません"),
  );
  assert.match(doc.querySelector('meta[name="robots"]').content, /noindex/);
  assert.equal(new URL(doc.querySelector('link[rel="canonical"]').href).pathname, "/buncho-ureshi/not-a-page/");
  navigate("help/");
  assert.equal(doc.querySelector('meta[name="robots"]').content, "index, follow, max-image-preview:large");
  await window.happyDOM.abort();
  await window.happyDOM.close();
});

test("corrupt local settings, favorites and observations are normalized without injecting DOM", async () => {
  const window = new Window({
    url: "https://djnaoyaman.github.io/buncho-ureshi/",
    settings: {
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
    },
  });
  for (const key of [
    "window",
    "document",
    "location",
    "history",
    "navigator",
    "localStorage",
    "matchMedia",
    "Image",
    "FormData",
  ])
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value:
        key === "window"
          ? window
          : key === "matchMedia"
            ? window.matchMedia.bind(window)
            : window[key],
    });
  try {
    window.document.write(
      await readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    );
    const doc = window.document;
    const validFavorite = articles[0].id;
    const markup =
      '<img id="stored-note-injection" src="x" onerror="window.__noteInjected=true"><script>window.__noteInjected=true</script>';
    const safeNote = { date: "2026-11-02", note: "安全な既存の観察メモ" };
    const literalMarkupNote = {
      date: "2024-02-29",
      note: markup,
      unexpected: "保存時には取り除くフィールド",
    };
    window.localStorage.setItem(
      "buncho-settings",
      JSON.stringify({ ruby: "false", motion: { enabled: false }, extra: markup }),
    );
    window.localStorage.setItem(
      "buncho-favorites",
      JSON.stringify([
        null,
        12,
        {},
        "unknown-article",
        validFavorite,
        validFavorite,
        markup,
      ]),
    );
    window.localStorage.setItem(
      "buncho-observations",
      JSON.stringify([
        null,
        false,
        42,
        "not-a-note",
        [],
        {},
        { date: "2026-11-02", note: 123 },
        { date: null, note: "無効な日付型" },
        { date: "not-a-date", note: "無効な日付文字列" },
        { date: "2026-02-30", note: "存在しない日付" },
        { date: "2026-13-01", note: "存在しない月" },
        { date: "2026-1-02", note: "書式が違う日付" },
        { date: "2026-11-02", note: "   " },
        { date: "2026-11-02", note: "長".repeat(601) },
        { date: markup, note: "日付欄からの注入も拒否" },
        safeNote,
        literalMarkupNote,
      ]),
    );
    await import("../src/app.js?dom-corrupt-storage");
    const navigate = (route) => {
      const link = doc.createElement("a");
      link.href = "/buncho-ureshi/" + route;
      doc.body.append(link);
      link.click();
      link.remove();
    };
    const assertNoInjection = () => {
      assert.equal(doc.querySelector("#stored-note-injection"), null);
      assert.equal(doc.querySelector("main script"), null);
      assert.equal(doc.querySelector("main [onerror]"), null);
      assert.equal(window.__noteInjected, undefined);
    };
    const expectedMotion = !window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    assert.equal(doc.querySelector("main h1").textContent,
      "文鳥♬文鳥♬文鳥って嬉しいな♪");
    assert.equal(doc.documentElement.dataset.ruby, "on");
    assert.equal(doc.documentElement.dataset.motion, expectedMotion ? "on" : "off");
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-settings")), {
      ruby: true,
      motion: expectedMotion,
    });
    assertNoInjection();

    navigate("encyclopedia/");
    doc.querySelector('[data-category="favorites"]').click();
    assert.equal(doc.querySelectorAll(".article-card").length, 1);
    assert.ok(doc.querySelector(".article-card").href.endsWith(
      `/encyclopedia/${validFavorite}/`,
    ));
    doc.querySelector(".article-card").click();
    assert.equal(doc.querySelector("#favorite").getAttribute("aria-pressed"), "true");
    doc.querySelector("#favorite").click();
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-favorites")), []);
    doc.querySelector("#favorite").click();
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-favorites")), [validFavorite]);
    assertNoInjection();

    navigate("omochi/");
    assert.equal(doc.querySelectorAll("#observations .observation").length, 2);
    assert.ok(doc.querySelector("#observations").textContent.includes(safeNote.note));
    assert.ok(doc.querySelector("#observations").textContent.includes(markup));
    assert.ok(!doc.querySelector("#observations").textContent.includes("存在しない日付"));
    assert.ok(!doc.querySelector("#observations").textContent.includes("長".repeat(601)));
    assertNoInjection();
    const form = doc.querySelector("#observation-form");
    form.querySelector("[name=date]").value = "2026-11-02";
    form.querySelector("[name=note]").value = "破損データがあっても新しく保存できる";
    form.requestSubmit();
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-observations")), [
      { date: "2026-11-02", note: "破損データがあっても新しく保存できる" },
      safeNote,
      { date: literalMarkupNote.date, note: markup },
    ]);
    doc.querySelector('[data-delete-note="0"]').click();
    assert.equal(doc.querySelectorAll("#observations .observation").length, 2);
    assertNoInjection();

    // readObservations re-reads storage on navigation: bad root shapes, malformed
    // JSON, and the 200 KB read limit must all produce an empty usable notebook.
    for (const [label, raw] of [
      ["null root", "null"],
      ["object root", JSON.stringify(safeNote)],
      ["string root", JSON.stringify("not an array")],
      ["malformed JSON", "[not-json"],
      ["oversized storage", JSON.stringify([{ date: "2026-11-02", note: "大".repeat(200001) }])],
    ]) {
      window.localStorage.setItem("buncho-observations", raw);
      navigate("omochi/");
      assert.equal(doc.querySelectorAll("#observations .observation").length, 0, label);
      assert.ok(doc.querySelector("#observations").textContent.includes("まだ記録はありません"), label);
      assert.ok(doc.querySelector("#observation-form"), label);
      assertNoInjection();
    }
    const recoveredForm = doc.querySelector("#observation-form");
    recoveredForm.querySelector("[name=date]").value = "2026-11-02";
    recoveredForm.querySelector("[name=note]").value = "大きすぎる保存の後も続けられる";
    recoveredForm.requestSubmit();
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-observations")), [
      { date: "2026-11-02", note: "大きすぎる保存の後も続けられる" },
    ]);

    window.localStorage.setItem("buncho-observations", JSON.stringify(
      Array.from({ length: 105 }, (_, i) => ({ date: "2026-11-02", note: `上限確認 ${i}` })),
    ));
    navigate("omochi/");
    assert.equal(doc.querySelectorAll("#observations .observation").length, 100);
    assert.ok(!doc.querySelector("#observations").textContent.includes("上限確認 100"));
    navigate("help/");
    doc.querySelector("#motion-toggle").checked = false;
    doc.querySelector("#motion-toggle").dispatchEvent(new window.Event("change"));
    assert.equal(doc.querySelector("#ruby-toggle"), null);
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-settings")), {
      ruby: true,
      motion: false,
    });
    navigate("challenge/");
    doc.querySelector(`[data-answer="${quizzes[0].answer}"]`).click();
    assert.ok(doc.querySelector("#quiz-feedback").textContent.includes("そのとおり"));
    assertNoInjection();
  } finally {
    await window.happyDOM.abort();
    await window.happyDOM.close();
  }
});

test("site-wide search, truthful selected-part crops and literal photo credits", async () => {
  const window = new Window({
    url: "https://djnaoyaman.github.io/buncho-ureshi/?q=%E3%82%A2%E3%83%BC%E3%83%88",
    settings: {
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
    },
  });
  for (const key of ["window", "document", "location", "history", "navigator", "localStorage", "matchMedia", "Image", "FormData"])
    Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? window : key === "matchMedia" ? window.matchMedia.bind(window) : window[key] });
  const originalPhoto = { ...photos[0] };
  try {
    window.document.write(await readFile(new URL("../dist/index.html", import.meta.url), "utf8"));
    await import("../src/app.js?dom-search-crops-credits");
    const doc = window.document;
    const navigate = (route) => {
      const link = doc.createElement("a");
      link.href = "/buncho-ureshi/" + route;
      doc.body.append(link);
      link.click();
      link.remove();
    };
    const search = (query, formId = "search-results-form") => {
      const form = doc.getElementById(formId);
      form.querySelector('[name="query"]').value = query;
      form.requestSubmit();
    };
    const resultLink = (route) => doc.querySelector(`#section-results a[href="/buncho-ureshi/${route}"]`);
    // A direct/reloaded search URL works without a newly generated route.
    assert.equal(doc.querySelector("#search-query").value, "アート");
    assert.ok(resultLink("studio/"));
    assert.ok(doc.querySelector('#search-result-status[role="status"]'));
    assert.equal(doc.querySelector("#global-query").value, "アート");
    search("保存");
    assert.equal(new URLSearchParams(location.search).get("q"), "保存");
    for (const route of ["studio/", "game/", "help/"]) assert.ok(resultLink(route), route);
    search("ゲーム", "site-search");
    assert.ok(resultLink("game/"));
    assert.ok(resultLink("help/"));
    search("水浴び");
    assert.ok(doc.querySelectorAll("#search-article-results .article-card").length);
    assert.ok(doc.querySelector('a[href="/buncho-ureshi/encyclopedia/bathing/"]'));
    const articleLink = doc.querySelector("#search-article-results .article-card");
    articleLink.click();
    assert.equal(location.search, "");
    assert.ok(doc.querySelector(".article-body"));
    navigate("?q=" + encodeURIComponent("保存"));
    resultLink("help/").click();
    assert.ok(doc.querySelector("#help-storage"));
    assert.equal(location.search, "");
    // Popstate restores a query from the URL instead of stale closure state.
    history.replaceState({}, "", "/buncho-ureshi/?q=" + encodeURIComponent("アート"));
    window.dispatchEvent(new window.PopStateEvent("popstate"));
    assert.equal(doc.querySelector("#search-query").value, "アート");
    assert.ok(resultLink("studio/"));
    search("   ");
    assert.equal(doc.querySelectorAll(".section-result").length, 9);
    assert.equal(doc.querySelectorAll("#search-article-results .article-card").length, 0);
    assert.match(doc.querySelector("#search-result-status").textContent, /ことばを入れて/);
    const injection = '<img id="query-injection" onerror="window.__searchInjected=true">';
    search(injection);
    assert.match(doc.querySelector("#search-result-status").textContent, /0件/);
    assert.ok(doc.querySelector(".search-empty"));
    assert.equal(doc.querySelector("#query-injection"), null);
    assert.equal(doc.querySelector("#search-query").value, injection);
    assert.equal(window.__searchInjected, undefined);
    navigate("body/");
    const expected = { beak: "beak", eye: "eyes", ear: "ears", wing: "wings", feathers: "feathers", tail: "tail", feet: "feet" };
    const cropRegions = new Set();
    for (const [part, articleId] of Object.entries(expected)) {
      const button = doc.querySelector(`[data-part="${part}"]`);
      assert.equal(button.getAttribute("aria-controls"), "part-detail");
      button.click();
      assert.equal(button.getAttribute("aria-pressed"), "true");
      assert.equal(doc.querySelectorAll('[data-part][aria-pressed="true"]').length, 1);
      const zoom = doc.querySelector('#part-detail .part-zoom[role="img"]');
      assert.ok(zoom);
      assert.ok(zoom.getAttribute("aria-label").includes("拡大"));
      const [x, y, width, height] = zoom.getAttribute("viewBox").split(" ").map(Number);
      const image = zoom.querySelector("image");
      assert.ok(image.getAttribute("href").startsWith("/buncho-ureshi/photos/photo-"));
      const sourceWidth = Number(image.getAttribute("width")), sourceHeight = Number(image.getAttribute("height"));
      assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
      assert.ok(x + width <= sourceWidth && y + height <= sourceHeight);
      assert.ok(width < sourceWidth / 2 && height < sourceHeight / 2, `${part} is genuinely cropped, not a full bird`);
      cropRegions.add(image.getAttribute("href") + zoom.getAttribute("viewBox"));
      assert.ok(doc.querySelector(`a[href="/buncho-ureshi/encyclopedia/${articleId}/"]`));
      const context = doc.querySelector("details.part-context");
      assert.ok(context.querySelector("summary"));
      const rectangle = context.querySelector("rect");
      for (const [attribute, value] of Object.entries({ x, y, width, height })) assert.equal(Number(rectangle.getAttribute(attribute)), value);
      assert.match(doc.querySelector(".part-credit").textContent, /切り抜き拡大/);
      assert.equal(doc.querySelectorAll(".part-credit a").length, 2);
      if (part === "ear") {
        assert.match(doc.querySelector(".part-photo").textContent, /耳の穴は羽毛の下にかくれ/);
        assert.match(zoom.getAttribute("aria-label"), /見えません/);
      }
    }
    assert.equal(cropRegions.size, 7);
    navigate("credits/");
    const credit = doc.querySelector(`[data-photo-credit="${photos[0].id}"]`);
    for (const key of ["title", "author", "credit", "acquiredAt", "modifications", "license"]) assert.ok(credit.textContent.includes(photos[0][key]), key);
    for (const key of ["title", "author", "credit", "modifications"]) photos[0][key] = `<img id="credit-injection-${key}" onerror="window.__creditInjected=true">`;
    navigate("help/");
    navigate("credits/");
    const escaped = doc.querySelector(`[data-photo-credit="${photos[0].id}"]`);
    for (const key of ["title", "author", "credit", "modifications"]) {
      assert.ok(escaped.textContent.includes(photos[0][key]));
      assert.equal(doc.getElementById(`credit-injection-${key}`), null);
    }
    assert.equal(window.__creditInjected, undefined);
    assert.equal(doc.querySelector("main [onerror]"), null);
  } finally {
    Object.assign(photos[0], originalPhoto);
    await window.happyDOM.abort();
    await window.happyDOM.close();
  }
});

test("launch metadata, safe page sharing, access help and always-on legacy ruby migration", async () => {
  const { routeMetadata } = await import("../src/metadata.js");
  const window = new Window({
    url: "https://djnaoyaman.github.io/buncho-ureshi/",
    settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true },
  });
  for (const key of ["window", "document", "location", "history", "navigator", "localStorage", "matchMedia", "Image", "FormData"])
    Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? window : key === "matchMedia" ? window.matchMedia.bind(window) : window[key] });
  const originalGame = '{"untouched":"game backup placeholder for preservation check"}';
  const favorite = articles[0].id;
  const note = [{ date: "2026-11-02", note: "残す観察" }];
  window.localStorage.setItem("buncho-settings", JSON.stringify({ ruby: false, motion: false }));
  window.localStorage.setItem("buncho-favorites", JSON.stringify([favorite]));
  window.localStorage.setItem("buncho-observations", JSON.stringify(note));
  window.localStorage.setItem("buncho-test-unrelated-save", originalGame);
  try {
    window.document.write(await readFile(new URL("../dist/index.html", import.meta.url), "utf8"));
    const doc = window.document;
    await import("../src/app.js?dom-launch-migration");
    const navigate = route => {
      const link = doc.createElement("a");
      link.href = "/buncho-ureshi/" + route;
      doc.body.append(link); link.click(); link.remove();
    };
    const settle = () => new Promise(resolve => setImmediate(resolve));
    const setAPI = (name, value) => Object.defineProperty(window.navigator, name, { configurable: true, value });
    const assertRuby = () => {
      assert.equal(doc.querySelector("#ruby-toggle"), null);
      assert.equal(doc.documentElement.dataset.ruby, "on");
      assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-settings")), { ruby: true, motion: false });
    };
    assertRuby();
    assert.equal(window.localStorage.getItem("buncho-test-unrelated-save"), originalGame);
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-favorites")), [favorite]);
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-observations")), note);
    for (const route of ["", "encyclopedia/", `encyclopedia/${favorite}/`, "body/", "help/", "credits/", "missing-page/"]) {
      navigate(route);
      const meta = routeMetadata(route);
      assert.equal(doc.title, meta.title);
      assert.equal(doc.querySelector('meta[name="description"]').content, meta.description);
      assert.equal(doc.querySelector('meta[name="robots"]').content, meta.robots);
      assert.equal(doc.querySelector('link[rel="canonical"]').href, meta.canonical);
      for (const [name, value] of [["twitter:title", meta.title], ["twitter:description", meta.description], ["twitter:image", meta.imageURL], ["twitter:image:alt", meta.imageAlt]])
        assert.equal(doc.querySelector(`meta[name="${name}"]`).content, value);
      assert.deepEqual(JSON.parse(doc.querySelector("#site-jsonld").textContent), meta.structuredData);
      assertRuby();
    }
    navigate("?q=" + encodeURIComponent("非公開にしたい検索語") + "&qa=1");
    history.replaceState({}, "", location.href + "#private");
    assert.equal(doc.querySelector('meta[name="robots"]').content, "noindex, follow");
    assert.equal(doc.querySelector('link[rel="canonical"]').href, "https://djnaoyaman.github.io/buncho-ureshi/");
    const writes = [];
    setAPI("clipboard", { writeText: async value => { writes.push(value); } });
    doc.querySelector("#page-copy-url").click(); await settle();
    assert.deepEqual(writes, ["https://djnaoyaman.github.io/buncho-ureshi/"]);
    assert.match(doc.querySelector("#page-share-status").textContent, /コピーしました/);
    assert.equal(doc.querySelector("#page-share-fallback").hidden, true);

    navigate("encyclopedia/" + favorite + "/");
    const shared = [];
    setAPI("share", async payload => { shared.push(payload); });
    doc.querySelector("#page-share").click(); await settle();
    assert.deepEqual(shared, [{ title: doc.title, url: routeMetadata(`encyclopedia/${favorite}/`).canonical }]);
    assert.equal(shared[0].files, undefined);
    assert.match(doc.querySelector("#page-share-status").textContent, /共有操作が完了/);
    setAPI("share", async () => { const error = new Error("cancel"); error.name = "AbortError"; throw error; });
    doc.querySelector("#page-share").click(); await settle();
    assert.match(doc.querySelector("#page-share-status").textContent, /キャンセル/);
    assert.equal(writes.length, 1, "cancel does not copy or send anything else");
    setAPI("share", undefined);
    setAPI("clipboard", { writeText: async () => { throw new Error("permission denied"); } });
    doc.querySelector("#page-share").click(); await settle();
    assert.equal(doc.querySelector("#page-share-fallback").hidden, false);
    assert.equal(doc.querySelector("#page-share-url").value, routeMetadata(`encyclopedia/${favorite}/`).canonical);
    assert.equal(doc.querySelector("#page-share-url").readOnly, true);
    assert.equal(doc.activeElement.id, "page-share-url");
    assert.match(doc.querySelector("#page-share-status").textContent, /自動コピーを使えません/);
    setAPI("clipboard", undefined);
    doc.querySelector("#page-copy-url").click(); await settle();
    assert.equal(doc.querySelector("#page-share-fallback").hidden, false);

    // A delayed permission dialog cannot overwrite a newly navigated page's UI.
    let finishCopy;
    setAPI("clipboard", { writeText: () => new Promise(resolve => { finishCopy = resolve; }) });
    doc.querySelector("#page-copy-url").click();
    navigate("help/");
    finishCopy(); await settle();
    assert.equal(doc.querySelector("#page-share-status").textContent, "");
    assert.equal(doc.querySelector("#page-share-fallback").hidden, true);
    assert.equal(doc.querySelector("#page-copy-url").disabled, false);
    assert.match(doc.querySelector("#help-access").textContent, /ホーム画面に追加/);
    assert.match(doc.querySelector("#help-access").textContent, /オフラインでの利用には対応していません/);
    assert.match(doc.querySelector("#help-storage").textContent, /アクセス解析.*未導入/);
    assert.match(doc.querySelector("#help-reading").textContent, /ふりがなはいつも表示/);
    assert.doesNotMatch(doc.querySelector("#help-reading").textContent, /切り替え/);
    let scroll;
    window.scrollTo = options => { scroll = options; };
    doc.querySelector("#page-top").click();
    assert.equal(scroll.top, 0);
    assert.equal(doc.activeElement.id, "main");
    doc.querySelector("#motion-toggle").checked = true;
    doc.querySelector("#motion-toggle").dispatchEvent(new window.Event("change"));
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-settings")), { ruby: true, motion: true });
    assert.equal(doc.documentElement.dataset.ruby, "on");
    // Re-initialize the app from the same saved settings as a reload would.
    window.document.write(await readFile(new URL("../dist/index.html", import.meta.url), "utf8"));
    await import("../src/app.js?dom-launch-reload");
    assert.equal(doc.documentElement.dataset.ruby, "on");
    assert.equal(doc.querySelector("#ruby-toggle"), null);
    assert.deepEqual(JSON.parse(window.localStorage.getItem("buncho-settings")), { ruby: true, motion: true });
    assert.equal(window.localStorage.getItem("buncho-test-unrelated-save"), originalGame);
  } finally {
    await window.happyDOM.abort();
    await window.happyDOM.close();
  }
});
