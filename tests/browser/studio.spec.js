import { test, expect } from '@playwright/test';
import { photos } from '../../src/data/photos.js';

const KEY = 'buncho-ureshi-studio-v1';
const artPhoto = photos.find(p => p.artAllowed);
const control = (page, name) => page.locator(`[data-studio="${name}"]`);
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
async function selected(page) {
  const id = await control(page, 'layers').inputValue();
  return (await saved(page)).items.find(o => o.id === id);
}
async function openStudio(page) {
  await page.goto('studio/');
  await expect(control(page, 'canvas')).toBeVisible();
  await expect(control(page, 'templates').locator('button')).toHaveCount(6);
}
async function setRange(page, name, value) {
  await control(page, name).evaluate((input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function addPhoto(page, id = artPhoto.id) {
  const details = page.locator('.studio-photo-details');
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await page.locator(`[data-photo="${id}"]`).click();
  await expect.poll(async () => (await selected(page))?.photoId).toBe(id);
}
async function downloadBytes(download) {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('PNG download has no readable stream.');
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

// Observe native drawing/audio calls without substituting rendering or playback.
// This is local page instrumentation, not a claim that audio was heard by a human.
async function installAudit(context) {
  await context.addInitScript(() => {
    window.__studioAudit = { text: [], images: 0, audioCreated: 0, audioClosed: 0, starts: 0, stops: 0, gains: [] };
    const audit = window.__studioAudit;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (this.canvas.width === 1400) audit.text.push(String(text));
      return fillText.call(this, text, ...args);
    };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (this.canvas.width === 1400) audit.images++;
      return drawImage.apply(this, args);
    };
    for (const key of ['AudioContext', 'webkitAudioContext']) {
      const Original = window[key];
      if (!Original) continue;
      window[key] = new Proxy(Original, {
        construct(Target, args) {
          const audio = Reflect.construct(Target, args);
          audit.audioCreated++;
          const createOscillator = audio.createOscillator.bind(audio);
          audio.createOscillator = () => {
            const oscillator = createOscillator();
            const start = oscillator.start.bind(oscillator), stop = oscillator.stop.bind(oscillator);
            oscillator.start = (...a) => { audit.starts++; return start(...a); };
            oscillator.stop = (...a) => { audit.stops++; return stop(...a); };
            return oscillator;
          };
          const createGain = audio.createGain.bind(audio);
          audio.createGain = () => {
            const gain = createGain(), setTarget = gain.gain.setTargetAtTime.bind(gain.gain);
            if (!window.__studioMasterGain) window.__studioMasterGain = gain;
            gain.gain.setTargetAtTime = (value, ...a) => { audit.gains.push(value); return setTarget(value, ...a); };
            return gain;
          };
          const close = audio.close.bind(audio);
          audio.close = () => { audit.audioClosed++; return close(); };
          return audio;
        }
      });
    }
  });
}

test.beforeEach(async ({ context, page }) => {
  await installAudit(context);
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i, route => route.abort());
});

test('six templates, eight backgrounds and palettes, and local table of contents work', async ({ page }, testInfo) => {
  await openStudio(page);
  await expect(control(page, 'background').locator('option')).toHaveCount(8);
  await expect(control(page, 'palettes').locator('button')).toHaveCount(8);
  const compositions = new Set();
  for (let i = 0; i < 6; i++) {
    await page.locator(`[data-template="${i}"]`).click();
    const state = await saved(page);
    expect(state.items.length).toBeGreaterThan(0);
    compositions.add(JSON.stringify([state.background, state.palette, state.format, state.items.map(o => o.kind)]));
  }
  expect(compositions.size).toBe(6);
  for (let i = 0; i < 8; i++) {
    await control(page, 'background').selectOption(String(i));
    expect((await saved(page)).background).toBe(i);
    await control(page, 'palettes').locator('button').nth(i).click();
    expect((await saved(page)).palette).toBe(i);
    await expect(control(page, 'palettes').locator('button').nth(i)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('.studio-steps a').filter({ hasText: '③' }).click();
  await expect(page).toHaveURL(/\/studio\/#studio-tools$/);
  await expect(page.locator('#studio-tools')).toBeInViewport();
  await expect(control(page, 'canvas')).toHaveCount(1);
  await testInfo.attach('studio-template-preview', { body: await page.locator('.studio-preview').screenshot(), contentType: 'image/png' });
});

test('photo crop/tint, text editing, movement, scale, rotation, layers, duplicate and delete persist', async ({ page }) => {
  await openStudio(page);
  await addPhoto(page);
  const id = (await selected(page)).id;
  await setRange(page, 'color', '#b36d83');
  await setRange(page, 'tint', 0.4);
  await control(page, 'clip').selectOption('oval');
  expect(await selected(page)).toMatchObject({ id, kind: 'photo', tint: 0.4, clip: 'oval', color: '#b36d83' });
  await control(page, 'clip').selectOption('leaf');
  await setRange(page, 'size', 360);
  await setRange(page, 'rotation', 35);
  const beforeMove = await selected(page);
  await action(page, 'right').click();
  await action(page, 'down').click();
  expect((await selected(page)).x).toBeGreaterThan(beforeMove.x);
  expect((await selected(page)).y).toBeGreaterThan(beforeMove.y);
  await action(page, 'larger').click();
  await action(page, 'smaller').click();
  await action(page, 'rotate-left').click();
  await action(page, 'rotate-right').click();
  expect(await selected(page)).toMatchObject({ w: 360, r: 35 });
  const beforeLayer = (await saved(page)).items.findIndex(o => o.id === id);
  await action(page, 'back').click();
  expect((await saved(page)).items.findIndex(o => o.id === id)).toBe(beforeLayer - 1);
  await action(page, 'front').click();
  expect((await saved(page)).items.findIndex(o => o.id === id)).toBe(beforeLayer);
  const beforeDuplicate = (await saved(page)).items.length;
  await action(page, 'duplicate').click();
  expect((await saved(page)).items).toHaveLength(beforeDuplicate + 1);
  expect((await selected(page)).id).not.toBe(id);
  await action(page, 'delete').click();
  expect((await saved(page)).items).toHaveLength(beforeDuplicate);
  await control(page, 'title').fill('花と文鳥の午後');
  await action(page, 'title').click();
  await control(page, 'text').fill('<script>window.bad=1</script>');
  await action(page, 'text').click();
  expect((await selected(page)).text).toBe('<script>window.bad=1</script>');
  expect(await page.evaluate(() => window.bad)).toBeUndefined();
  await control(page, 'text').fill('いっしょに、ひとやすみ');
  await action(page, 'apply-text').click();
  expect((await selected(page)).text).toBe('いっしょに、ひとやすみ');
  const expected = await saved(page);
  await page.reload();
  await expect(control(page, 'canvas')).toBeVisible();
  expect(await saved(page)).toEqual(expected);
  await expect(control(page, 'title')).toHaveValue('花と文鳥の午後');
});

test('reset cancel preserves the composition; confirm clears it; undo and redo are reversible', async ({ page }) => {
  await openStudio(page);
  await page.locator('[data-material="bird-sakura"]').click();
  const original = await saved(page);
  page.once('dialog', dialog => dialog.dismiss());
  await action(page, 'reset').click();
  expect(await saved(page)).toEqual(original);
  await expect(control(page, 'status')).toContainText('そのまま');
  page.once('dialog', dialog => dialog.accept());
  await action(page, 'reset').click();
  expect((await saved(page)).items).toHaveLength(0);
  await action(page, 'undo').click();
  expect(await saved(page)).toEqual(original);
  await action(page, 'redo').click();
  expect((await saved(page)).items).toHaveLength(0);
  await action(page, 'undo').click();
  await control(page, 'title').fill('別の道');
  await action(page, 'title').click();
  await expect(action(page, 'redo')).toBeDisabled();
});

test('pointer drag and cancellation plus keyboard alternatives do not lose the selected item', async ({ page }) => {
  await openStudio(page);
  await page.locator('[data-material="bird-white"]').click();
  const canvas = control(page, 'canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const original = await selected(page);
  // Newly added bird is centered in the artwork area; its canvas center lies near 52% height.
  const x = box.x + box.width * 0.5, y = box.y + box.height * 0.52;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + box.width * 0.09, y + box.height * 0.02, { steps: 4 });
  await page.mouse.up();
  expect((await selected(page)).id).toBe(original.id);
  expect((await selected(page)).x).toBeGreaterThan(original.x);
  const moved = await saved(page);
  const secondX = x + box.width * 0.09, secondY = y + box.height * 0.02;
  await canvas.evaluate(c => c.addEventListener('pointerdown', event => { window.__studioPointerId = event.pointerId; }, { once: true }));
  await page.mouse.move(secondX, secondY);
  await page.mouse.down();
  await page.mouse.move(secondX - box.width * 0.08, secondY, { steps: 3 });
  await canvas.dispatchEvent('pointercancel', { pointerId: await page.evaluate(() => window.__studioPointerId), pointerType: 'mouse', isPrimary: true });
  await page.mouse.up();
  expect(await saved(page)).toEqual(moved);
  await canvas.focus();
  const beforeKey = await selected(page);
  await page.keyboard.press('ArrowLeft');
  expect((await selected(page)).x).toBeLessThan(beforeKey.x);
  const beforeRotate = (await selected(page)).r;
  await action(page, 'rotate-right').click();
  expect((await selected(page)).r).not.toBe(beforeRotate);
});

test('touch selection and movement buttons work on a 390px touch viewport', async ({ browser, browserName, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }) });
  const page = await context.newPage();
  try {
    await openStudio(page);
    await page.locator('[data-material="bird-white"]').tap();
    const before = await selected(page);
    await action(page, 'right').tap();
    await action(page, 'larger').tap();
    await action(page, 'rotate-right').tap();
    const after = await selected(page);
    expect(after.id).toBe(before.id);
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.w).toBeGreaterThan(before.w);
    expect(after.r).not.toBe(before.r);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally { await context.close(); }
});

for (const [format, width, height] of [['square', 1400, 1400], ['portrait', 1400, 1750]]) {
  test(`${format} PNG decodes at exact dimensions and retains actual photo, title, logo and credit pixels`, async ({ context, page }, testInfo) => {
    await context.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined }); });
    await openStudio(page);
    await addPhoto(page);
    await control(page, 'title').fill('文鳥の記念アルバム');
    await action(page, 'title').click();
    await setRange(page, 'tint', 0.3);
    await control(page, 'format').selectOption(format);
    await action(page, 'export').click();
    const preview = control(page, 'export-preview');
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([width, height]);
    const audit = await page.evaluate(() => window.__studioAudit);
    const text = audit.text.join('');
    expect(text).toContain('文鳥の記念アルバム');
    expect(text).toContain('文鳥♬文鳥♬文鳥って嬉しいな♪');
    expect(text).toContain(artPhoto.author);
    expect(text).toContain(artPhoto.license);
    expect(text).toContain(decodeURI(artPhoto.source));
    expect(text).toContain(artPhoto.licenseUrl);
    expect(text).toContain('色調整');
    expect(audit.images).toBeGreaterThan(0);
    // Decode the generated bitmap and confirm nonblank detailed pixels in its footer.
    const readFooter = () => preview.evaluate(async img => {
      await img.decode();
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(60, c.height - 200, c.width - 120, 170).data;
      let dark = 0, light = 0, opaque = 0;
      for (let i = 0; i < data.length; i += 4) { if (data[i + 3] === 255) opaque++; if (data[i] + data[i + 1] + data[i + 2] < 450) dark++; else if (data[i] + data[i + 1] + data[i + 2] > 630) light++; }
      return { dark, light, opaque, pixels: data.length / 4 };
    });
    // A decoded image can precede WebKit's usable Canvas readback. Keep both
    // original pixel gates and require an opaque bitmap, rather than accepting
    // transparent zeroes as dark "credit" pixels or retrying the whole test.
    const footerReadbacks = [];
    try {
      await expect.poll(async () => {
        const sample = await readFooter(); footerReadbacks.push(sample);
        return sample.dark > 100 && sample.light > 1000 && sample.opaque === sample.pixels;
      }, { message: 'decoded PNG footer contains real dark text and opaque light paper' }).toBe(true);
    } finally {
      await testInfo.attach(`studio-${format}-footer-readbacks`, { body: Buffer.from(JSON.stringify(footerReadbacks, null, 2)), contentType: 'application/json' });
    }
    const footer = footerReadbacks.at(-1);
    expect(footer.dark).toBeGreaterThan(100);
    expect(footer.light).toBeGreaterThan(1000);
    expect(footer.opaque).toBe(footer.pixels);
    await expect(action(page, 'share')).toBeHidden();
    await expect(control(page, 'share-help')).toContainText('保存してから共有');
    const promise = page.waitForEvent('download');
    await control(page, 'download').click();
    const download = await promise, bytes = await downloadBytes(download);
    expect(bytes.length).toBeGreaterThan(20000);
    expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(width);
    expect(bytes.readUInt32BE(20)).toBe(height);
    expect(download.suggestedFilename()).toBe(`buncho-${format}.png`);
    await testInfo.attach(`studio-${format}-export`, { body: bytes, contentType: 'image/png' });
  });
}

test('audio is opt-in; user playback, mute, volume, stop and SFX controls affect native audio', async ({ page }) => {
  await openStudio(page);
  await page.locator('[data-template="1"]').click();
  expect((await page.evaluate(() => window.__studioAudit)).audioCreated).toBe(0);
  await expect(control(page, 'audio-status')).toHaveText('音はまだ出ません。');
  await action(page, 'play').click();
  await expect(control(page, 'audio-status')).toContainText('再生中');
  await expect.poll(() => page.evaluate(() => window.__studioAudit.starts)).toBeGreaterThan(0);
  await action(page, 'mute').click();
  await expect(action(page, 'mute')).toHaveAttribute('aria-pressed', 'true');
  // Read the actual native master gain, not an instance-method wrapper that WebKit may recreate.
  await expect.poll(() => page.evaluate(() => window.__studioMasterGain?.gain.value)).toBeLessThan(0.0001);
  await setRange(page, 'volume', 50);
  await action(page, 'mute').click();
  await expect(action(page, 'mute')).toHaveAttribute('aria-pressed', 'false');
  await expect(control(page, 'audio-status')).toHaveText('ミュートを解除しました。');
  await expect.poll(() => page.evaluate(() => window.__studioMasterGain?.gain.value)).toBeCloseTo(0.11, 5);
  await action(page, 'stop').click();
  await expect(control(page, 'audio-status')).toContainText('停止');
  const stopped = await page.evaluate(() => window.__studioAudit.starts);
  // Two melody intervals would have occurred in this window if stop left its timer running.
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.__studioAudit.starts)).toBe(stopped);
  await action(page, 'sfx').click();
  await expect(action(page, 'sfx')).toHaveAttribute('aria-pressed', 'true');
  const before = await page.evaluate(() => window.__studioAudit.starts);
  await page.locator('[data-material="flower"]').click();
  expect(await page.evaluate(() => window.__studioAudit.starts)).toBeGreaterThan(before);
  await action(page, 'sfx').click();
  await expect(action(page, 'sfx')).toHaveAttribute('aria-pressed', 'false');
});

test('interrupted export and rapid navigation clean up audio and retain the latest composition', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/photos/' + artPhoto.id + '.webp', async route => {
    await new Promise(resolve => setTimeout(resolve, 800));
    await route.continue();
  });
  await openStudio(page);
  await addPhoto(page);
  await control(page, 'title').fill('もどってくる作品');
  await action(page, 'title').click();
  await action(page, 'play').click();
  await action(page, 'export').click();
  await page.locator('.desktop-nav [data-nav="encyclopedia/"]').click();
  await expect(page).toHaveURL(/\/encyclopedia\/$/);
  await expect(control(page, 'canvas')).toHaveCount(0);
  expect(await page.evaluate(() => window.__studioAudit.audioClosed)).toBe(1);
  await page.goBack();
  await expect(control(page, 'canvas')).toBeVisible();
  await expect(control(page, 'title')).toHaveValue('もどってくる作品');
  await expect(control(page, 'export-panel')).toBeHidden();
  await expect(control(page, 'audio-status')).toHaveText('音はまだ出ません。');
  for (let i = 0; i < 2; i++) {
    await page.locator('.desktop-nav [data-nav="encyclopedia/"]').click();
    await page.locator('.desktop-nav [data-nav="studio/"]').click();
  }
  await expect(control(page, 'canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('game memorial uses real game name labels and undo restores the preceding studio work', async ({ page }) => {
  await openStudio(page);
  await control(page, 'title').fill('さっきまでの作品');
  await action(page, 'title').click();
  const before = await saved(page);
  await page.locator('.desktop-nav [data-nav="game/"]').click();
  await expect(page.locator('.game-profile-heading h3')).toHaveText('おもち');
  await page.locator('[data-game-art="b1"]').first().click();
  await expect(page).toHaveURL(/\/studio\/$/);
  await expect(control(page, 'title')).toHaveValue('おもちの家族');
  await expect(control(page, 'layers')).toContainText('おもち');
  const state = await saved(page);
  expect(state.items.some(o => o.kind === 'bird' && o.birdName === 'おもち' && o.birdColor === 'white' && o.birdStage === 'adult')).toBe(true);
  expect(state.items.some(o => o.kind === 'text' && o.text === 'おもち')).toBe(true);
  await action(page, 'export').click();
  await expect(control(page, 'export-preview')).toBeVisible();
  expect((await page.evaluate(() => window.__studioAudit.text)).join('')).toContain('おもち');
  await action(page, 'undo').click();
  expect(await saved(page)).toEqual(before);
});
