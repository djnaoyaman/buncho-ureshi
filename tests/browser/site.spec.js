import { test, expect } from "@playwright/test";
import { articles } from "../../src/data/articles.js";
import { quizzes } from "../../src/data/quizzes.js";
import { photos } from "../../src/data/photos.js";

async function decodePageImages(page) {
  return page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => { image.loading = "eager"; });
    await Promise.all(images.map(image => image.decode().catch(() => {})));
    return images.every(image => image.complete && image.naturalWidth > 0);
  });
}
const routes = [
  "",
  "encyclopedia/",
  "body/",
  "omochi/",
  "challenge/",
  "studio/",
  "game/",
  "credits/",
  "help/",
];
test.beforeEach(async ({ page }) => {
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i, (r) => r.abort());
});
for (const width of [320, 375, 390, 768, 1024, 1440]) {
  for (const orientation of ["portrait", "landscape"])
    test(`responsive ${width} ${orientation}`, async ({ page }, info) => {
      await page.setViewportSize({
        width,
        height:
          orientation === "portrait"
            ? Math.max(800, width)
            : Math.max(320, Math.round(width * 0.58)),
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      for (const route of ["", "encyclopedia/", "studio/", "game/"]) {
        await page.goto(route);
        await expect(page.locator("main h1")).toBeVisible();
        if (route === "studio/") await expect(page.locator('[data-studio="canvas"]')).toBeVisible();
        if (route === "game/") await expect(page.locator('#game-root .game-app')).toBeVisible();
        await page.waitForTimeout(200);
        if (route === "studio/" && orientation === "portrait" && [375, 768, 1440].includes(width) && info.project.name === "chromium") {
          await info.attach(`studio-responsive-${width}`, { body: await page.locator('#studio-root').screenshot({ animations: "disabled" }), contentType: "image/png" });
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBeTruthy();
      }
      expect(errors).toEqual([]);
      await page.goto("");
      await expect(page.locator("main h1")).toBeVisible();
      expect(await decodePageImages(page)).toBe(true);
      await page.screenshot({
        path: info.outputPath(`home-${width}-${orientation}.png`),
        fullPage: true,
      });
    });
}
test("direct URLs, reloads and photograph decoding", async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    ...routes,
    ...articles.slice(0, 5).map((a) => `encyclopedia/${a.id}/`),
  ]) {
    const res = await page.goto(route);
    expect(res.status()).toBe(200);
    await page.reload();
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      /buncho-ureshi/,
    );
  }
  await page.goto("credits/");
  await expect(page.locator(".credits-grid img")).toHaveCount(photos.length);
  await page.locator(".credits-grid").scrollIntoViewIfNeeded();
  expect(await decodePageImages(page)).toBe(true);
  expect(
    await page
      .locator(".credits-grid img")
      .evaluateAll((imgs) => imgs.every((i) => i.naturalWidth > 0)),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test("search filter favorites ruby and history", async ({ page }, info) => {
  await page.addInitScript(() => {
    // An existing visitor's old preference must not hide the required furigana.
    if (!localStorage.getItem("buncho-settings"))
      localStorage.setItem("buncho-settings", JSON.stringify({ ruby: false, motion: false }));
  });
  // Passive diagnostics retain the exact failing history/reload flow. They do
  // not replace native history methods or change browser preferences.
  const navigationEvents = [];
  const record = (type, detail = {}) => {
    navigationEvents.push({ type, ...detail });
    if (navigationEvents.length > 80) navigationEvents.shift();
  };
  const prefix = "buncho-history-diagnostic:";
  page.on("console", message => {
    if (message.type() === "debug" && message.text().startsWith(prefix)) {
      try { record("lifecycle", JSON.parse(message.text().slice(prefix.length))); }
      catch { record("diagnostic-parse-error"); }
    }
  });
  page.on("framenavigated", frame => {
    if (frame === page.mainFrame()) record("navigation", { url: frame.url() });
  });
  page.on("requestfailed", request => {
    if (request.isNavigationRequest()) record("document-request-failed", {
      url: request.url(), error: request.failure()?.errorText,
    });
  });
  page.on("pageerror", error => record("pageerror", { message: error.message }));
  page.on("crash", () => record("crash", { url: page.url() }));
  await page.addInitScript(({ prefix }) => {
    const report = event => console.debug(prefix + JSON.stringify({
      event: event.type, url: location.href, historyLength: history.length,
      persisted: event.persisted ?? null, state: history.state,
    }));
    for (const type of ["pageshow", "pagehide", "popstate"])
      window.addEventListener(type, report, { passive: true });
  }, { prefix });
  try {
    await page.goto("encyclopedia/");
    await page.locator("#article-search").fill("水");
    await expect(page.locator(".article-card").first()).toBeVisible();
    const favoriteHref = await page.locator(".article-card").first().getAttribute("href");
    await page.locator(".article-card").first().click();
    await page.locator("#favorite").click();
    await expect(page.locator("#favorite")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("#ruby-toggle")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-ruby", "on");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("buncho-settings")))).toEqual({ ruby: true, motion: false });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-ruby", "on");
    await page.goBack();
    // Assert the page restored by Back itself; another goto would mask a broken
    // history entry. Keep this regression flow identical across browser engines.
    await expect(page).toHaveURL(/\/buncho-ureshi\/encyclopedia\/$/);
    await expect(page.locator("#article-search")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-ruby", "on");
    await page.getByRole("button", { name: "♡ お気に入り", exact: true }).click();
    await expect(page.locator(".article-card")).toHaveCount(1);
    await expect(page.locator(".article-card")).toHaveAttribute("href", favoriteHref);
    // Keep full-navigation persistence coverage after testing the restored DOM.
    await page.reload();
    await expect(page.locator("#article-search")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-ruby", "on");
    await page.getByRole("button", { name: "♡ お気に入り", exact: true }).click();
    await expect(page.locator(".article-card")).toHaveCount(1);
    await expect(page.locator(".article-card")).toHaveAttribute("href", favoriteHref);
    await page.locator("#menu-toggle").click();
    await expect(page.locator("#menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#menu")).toBeHidden();
  } finally {
    await info.attach("history-navigation-diagnostics", {
      body: JSON.stringify({ project: info.project.name, events: navigationEvents }, null, 2),
      contentType: "application/json",
    });
  }
});
test("quiz answers and explanation links", async ({ page }) => {
  await page.goto("challenge/");
  for (let i = 0; i < quizzes.length; i++) {
    await page.locator(`[data-answer="${quizzes[i].answer}"]`).click();
    await expect(page.locator("#quiz-feedback")).toContainText("そのとおり");
    await expect(page.locator("#quiz-feedback a")).toHaveAttribute(
      "href",
      new RegExp(quizzes[i].articleId),
    );
    await page.locator("#quiz-next").click();
  }
  await expect(page.locator("#quiz-root")).toContainText(
    `${quizzes.length} / ${quizzes.length}`,
  );
});
test("keyboard access, truthful observation and local persistence", async ({
  page,
}) => {
  await page.goto("omochi/");
  await expect(page.locator("main")).toContainText(
    "本人の写真と観察エピソードは未提供",
  );
  await page
    .locator("textarea[name=note]")
    .fill("検証用の観察メモ。実在の記録ではありません。");
  await page.locator("#observation-form button").click();
  await page.reload();
  await expect(page.locator("#observations")).toContainText("検証用の観察");
  await page.locator("[data-delete-note]").click();
  await expect(page.locator("#observations")).toContainText(
    "まだ記録はありません",
  );
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement !== document.body),
  ).toBeTruthy();
});
test("speech controls safely call browser API", async ({ page }) => {
  await page.addInitScript(() => {
    window.__speech = [];
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel: () => window.__speech.push("cancel"),
        speak: (u) => window.__speech.push(u.text),
      },
    });
    window.SpeechSynthesisUtterance = class {
      constructor(t) {
        this.text = t;
      }
    };
  });
  await page.goto(`encyclopedia/${articles[0].id}/`);
  await page.locator("#speak").click();
  await page.locator("#stop-speak").click();
  expect(await page.evaluate(() => window.__speech.length)).toBeGreaterThan(2);
});

test("genuine licensed video can play, stop and mute from user controls", async ({
  page,
}) => {
  await page.goto("encyclopedia/voice/");
  const video = page.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  expect(await video.evaluate((v) => v.paused)).toBe(true);
  await page.locator("[data-video-play]").click();
  await expect
    .poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0))
    .toBe(true);
  await page.locator("[data-video-mute]").click();
  expect(await video.evaluate((v) => v.muted)).toBe(true);
  await page.locator("[data-video-stop]").click();
  expect(await video.evaluate((v) => v.paused && v.currentTime === 0)).toBe(
    true,
  );
});

test('sitewide search includes studio, game and help, and survives reload and history', async ({ page }) => {
  await page.goto('');
  await page.locator('#menu-toggle').click();
  await page.locator('#global-query').fill('アート');
  await page.locator('#site-search button').click();
  await expect(page.locator('#search-query')).toHaveValue('アート');
  await expect(page.locator('#section-results .section-result[href$="/studio/"]')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('q')).toBe('アート');
  await page.reload();
  await expect(page.locator('#search-query')).toHaveValue('アート');
  await page.locator('#search-query').fill('保存');
  await page.locator('#search-results-form button').click();
  for (const route of ['studio', 'game', 'help']) {
    await expect(page.locator(`#section-results .section-result[href$="/${route}/"]`)).toBeVisible();
  }
  await page.locator('#section-results .section-result[href$="/game/"]').click();
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#search-query')).toHaveValue('保存');
  expect(new URL(page.url()).searchParams.get('q')).toBe('保存');
  await page.locator('#search-query').fill('ゲーム');
  await page.locator('#search-results-form button').click();
  await expect(page.locator('#section-results .section-result[href$="/game/"]')).toBeVisible();
  await expect(page.locator('#section-results .section-result[href$="/help/"]')).toBeVisible();
  await page.locator('#search-query').fill('水浴び');
  await page.locator('#search-results-form button').click();
  await expect(page.locator('#search-article-results .article-card').first()).toBeVisible();
  await expect(page.locator('#search-result-status')).toContainText('図鑑の記事');
  await page.locator('#search-query').fill('zz_NO_RESULT_91375');
  await page.locator('#search-results-form button').click();
  await expect(page.locator('.search-empty')).toBeVisible();
  await expect(page.locator('#section-results .section-result')).toHaveCount(0);
  await expect(page.locator('#search-article-results .article-card')).toHaveCount(0);
  await page.locator('#search-query').fill('');
  await page.locator('#search-results-form button').click();
  await expect(page.locator('#search-result-status')).toContainText('ことばを入れて');
  expect(await page.locator('#section-results .section-result').count()).toBeGreaterThanOrEqual(8);
  await expect(page.locator('#search-article-results .article-card')).toHaveCount(0);
});

test('body explorer enlarges seven real photo regions with truthful ear context and source credits', async ({ page }, testInfo) => {
  await page.goto('body/');
  const regionSignatures = new Set();
  for (const [id, label] of [['beak', 'くちばし'], ['eye', '目'], ['ear', '耳'], ['wing', '翼'], ['feathers', '羽毛'], ['tail', '尾'], ['feet', '足']]) {
    const button = page.locator(`[data-part="${id}"]`);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveAttribute('aria-controls', 'part-detail');
    await expect(page.locator('[data-part][aria-pressed="true"]')).toHaveCount(1);
    const zoom = page.locator('#part-detail .part-zoom[role="img"]');
    await expect(zoom).toBeVisible();
    await expect(zoom).toHaveAccessibleName(new RegExp(label));
    const region = await zoom.evaluate(async svg => {
      const image = svg.querySelector('image'), box = svg.viewBox.baseVal;
      const href = new URL(image.getAttribute('href'), document.baseURI);
      const bitmap = new Image(); bitmap.src = href.href; await bitmap.decode();
      return {
        href: href.href, origin: href.origin, documentOrigin: location.origin,
        x: box.x, y: box.y, width: box.width, height: box.height,
        imageWidth: Number(image.getAttribute('width')), imageHeight: Number(image.getAttribute('height')),
        naturalWidth: bitmap.naturalWidth, naturalHeight: bitmap.naturalHeight,
      };
    });
    expect(region.origin).toBe(region.documentOrigin);
    expect(region.href).toMatch(/\/buncho-ureshi\/photos\/photo-\d+\.webp$/);
    expect(region.naturalWidth).toBe(region.imageWidth);
    expect(region.naturalHeight).toBe(region.imageHeight);
    expect(region.x).toBeGreaterThanOrEqual(0);
    expect(region.y).toBeGreaterThanOrEqual(0);
    expect(region.width).toBeGreaterThan(0);
    expect(region.height).toBeGreaterThan(0);
    expect(region.x + region.width).toBeLessThanOrEqual(region.imageWidth);
    expect(region.y + region.height).toBeLessThanOrEqual(region.imageHeight);
    expect(region.width).toBeLessThan(region.imageWidth);
    expect(region.height).toBeLessThan(region.imageHeight);
    regionSignatures.add(JSON.stringify([region.href, region.x, region.y, region.width, region.height]));
    await expect(page.locator('#part-detail .part-credit a')).toHaveCount(2);
    await expect(page.locator('#part-detail .part-credit')).toContainText('切り抜き拡大');
    if (id === 'ear') {
      await expect(page.locator('#part-detail figcaption')).toContainText('耳の穴は羽毛の下にかくれ');
      await expect(page.locator('#part-detail figcaption')).toContainText('この写真には見えていません');
    }
    if (id === 'beak') {
      await page.locator('#part-detail details.part-context summary').click();
      await expect(page.locator('#part-detail .part-context-image')).toBeVisible();
      const comparison = await page.locator('#part-detail .part-context-image').evaluate(svg => {
        const box = svg.viewBox.baseVal, rectangle = svg.querySelector('rect');
        return { full: [box.x, box.y, box.width, box.height], crop: ['x', 'y', 'width', 'height'].map(key => Number(rectangle.getAttribute(key))) };
      });
      expect(comparison.full).toEqual([0, 0, region.imageWidth, region.imageHeight]);
      expect(comparison.crop).toEqual([region.x, region.y, region.width, region.height]);
      if (testInfo.project.name === 'chromium') await testInfo.attach('body-beak-photo-and-crop', { body: await page.locator('#part-detail').screenshot(), contentType: 'image/png' });
    }
  }
  expect(regionSignatures.size).toBe(7);
  await page.locator('#part-detail a.button').click();
  await expect(page).toHaveURL(/\/encyclopedia\/feet\/$/);
  await expect(page.locator('.article-body')).toBeVisible();
});
