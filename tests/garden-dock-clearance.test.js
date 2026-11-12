import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {createWorld, createBird} from '../src/engine.js';
import {gardenStageGeometry} from '../src/data/gardens.js';
import {renderGardenStage} from '../src/encounter-ui.js';

const css = readFileSync(new URL('../src/game.css', import.meta.url), 'utf8');
const scope = 'body[data-world="buncho"] .game-panel-overlay[data-scene="true"] .finch-garden-stage';
const ordinary = `${scope}[data-garden-density="regular"]:not(:has(.finch-crow-scale-scene,.finch-raptor-scale-scene)) .finch-garden-image-plane`;

function rules() {
  const window = new Window(), style = window.document.createElement('style');
  style.textContent = css; window.document.head.append(style);
  return {window, rules:[...style.sheet.cssRules]};
}

test('dock fitting changes layout margins only, preserving motion ownership and isolated terrain geometry', async () => {
  const {window, rules:list} = rules();
  try {
    const plane = list.find(rule => rule.selectorText === ordinary);
    const actors = list.find(rule => rule.selectorText === `${ordinary} > :is(.finch-garden-friend,.finch-garden-household,.finch-garden-visitor)`);
    assert.ok(plane); assert.ok(actors);
    assert.equal(plane.style.getPropertyValue('--garden-plane-top'), 'clamp(calc(100cqh - var(--draw-h)),calc(65cqh - var(--garden-anchor-y) * var(--draw-h)),0px)');
    assert.equal(plane.style.getPropertyValue('--garden-lowest-foot'), 'calc(var(--garden-plane-top) + var(--garden-anchor-y) * var(--draw-h) + var(--garden-lower-row) * min(17cqh,110px))');
    assert.equal(plane.style.getPropertyValue('--garden-controls-rise'), 'max(0px,calc(var(--garden-lowest-foot) + 27px + var(--garden-dock-reserve) + env(safe-area-inset-bottom,0px) - 100cqh))');
    assert.equal(actors.style.cssText, 'margin-block-start: calc(0px - var(--garden-controls-rise));');
    assert.equal(list.find(rule => rule.selectorText === scope).style.getPropertyValue('--garden-dock-reserve'), '68px');
    assert.equal(list.find(rule => rule.selectorText === scope).style.getPropertyValue('--garden-lower-row'), '.75');
    assert.equal(list.find(rule => rule.selectorText === `${scope}[data-garden-id="mizukagami"]`).style.getPropertyValue('--garden-lower-row'), '.15');
    // happy-dom omits inactive media rules from this sheet; inspect the authored
    // tiny-height override rather than claiming this is a browser layout test.
    assert.match(css, /@media\(max-height:340px\)\s*\{\s*body\[data-world="buncho"\] \.game-panel-overlay\[data-scene="true"\] \.finch-garden-stage \{ --garden-dock-reserve: 60px; \}/);
  } finally { await window.happyDOM.close(); }
});

test('cover-clamped ordinary 3–6 bird rows clear the actual dock without shrinking or moving the source image', async () => {
  const window = new Window();
  try {
    for (const id of ['java-rice', 'bali-terrace', 'paris-unrest']) {
      for (const count of [3, 4, 5, 6]) {
        const w = createWorld(1000); w.encounters.garden.id = id;
        if (count === 3) {
          w.encounters.gardenFriends.visits = [{gardenId:id, visit:0, friendIds:w.encounters.gardenFriends.regulars.slice(0, 3).map(r => r.id), returningIds:[]}];
        }
        if (count >= 5) w.encounters.gardenFriends.attendees = ['b1'];
        if (count === 6) w.encounters.gardenFriends.attendees.push(createBird(w, {home:'resident'}).id);
        const before = structuredClone(w);
        window.document.body.innerHTML = renderGardenStage(w);
        const stage = window.document.querySelector('.finch-garden-stage');
        assert.equal(stage.dataset.gardenCount, String(count));
        assert.equal(stage.dataset.gardenDensity, 'regular');
        const offsets = [...stage.querySelectorAll('.finch-garden-image-plane > button')].map(button => {
          const match = button.getAttribute('style').match(/\+ (-?[\d.]+) \* min\(22cqw,120px\).*\+ (-?[\d.]+) \* min\(17cqh,110px\)/);
          assert.ok(match); return {dx:Number(match[1]), dy:Number(match[2])};
        });
        for (const [width, height] of [[390,844], [1280,800], [844,390], [667,375], [740,360]]) {
          const geometry = gardenStageGeometry(id, width, height), original = structuredClone(geometry);
          const anchor = geometry.friends[geometry.selectedIndex], step = Math.min(.17*height, 110);
          const birdWidth = height <= 500 ? 64 : Math.min(100, Math.max(64, width*.18));
          const birdHeight = height <= 500 ? 75.3 : Math.min(117.65, Math.max(75, width*.2118));
          const dockTop = height-(height <= 340 ? 60 : 68);
          const rise = Math.max(0, anchor.y+.75*step+27-dockTop);
          const boxes = offsets.map(({dx, dy}) => {
            const footX = anchor.x+dx*Math.min(.22*width, 120), footY = anchor.y+dy*step-rise;
            return {left:footX-.54*birdWidth, right:footX+.46*birdWidth, top:footY-.975*birdHeight, bottom:footY+.025*birdHeight, labelBottom:footY+.025*birdHeight+18};
          });
          for (const box of boxes) {
            assert.ok(box.left >= 0 && box.right <= width && box.top >= 0);
            assert.ok(box.labelBottom <= dockTop-6, `${id}, ${count} birds, ${width}×${height}: ${box.labelBottom} must clear ${dockTop}`);
            assert.ok(birdWidth >= 44 && birdHeight >= 44);
          }
          for (let a=0; a<boxes.length; a++) for (let b=a+1; b<boxes.length; b++) {
            const one = boxes[a], two = boxes[b];
            assert.equal(Math.max(0, Math.min(one.right, two.right)-Math.max(one.left, two.left))*Math.max(0, Math.min(one.bottom, two.bottom)-Math.max(one.top, two.top)), 0);
          }
          assert.deepEqual(geometry, original);
          if (height > 500) assert.equal(rise, 0, 'already-safe portrait and desktop scenes stay at their original positions');
          if (id === 'java-rice' && width === 844 && height === 390) {
            // The approved park replaces this source image; clearance remains asserted above.
            assert.ok(Number.isFinite(anchor.y));
          }

        }
        assert.deepEqual(w, before);
      }
    }
  } finally { await window.happyDOM.close(); }
});
