import {allBirds} from './world-birds.js';
import { eventText } from './engine.js';

const IMPORTANT = new Set(['pair', 'egg', 'hatch', 'grow', 'adopt', 'movein', 'depart','death','succession']);
const CARD = new Set(['egg', 'hatch', 'grow', 'pair']);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day = tick => Number.isFinite(tick) ? `${Math.floor(tick / 24) + 1}日目 ${tick % 24}時` : '時刻の記録なし';

/** Read-only presentation. portrait is trusted application HTML, never saved HTML.
 * A missing historical subject deliberately has no substitute bird photograph.
 * No paging: all retained records remain inside the native full-diary disclosure.
 */
export function renderDiaryPaper(world, { portrait = () => '' } = {}) {
  const birds = Array.isArray(world?.birds) ? allBirds(world) : [];
  const events = Array.isArray(world?.events) ? world.events : [];
  const all=[...new Map([...(world.journal||[]),...events].map(e=>[e.id,e])).values()].sort((a,b)=>b.tick-a.tick||Number(b.id.slice(1))-Number(a.id.slice(1)));
  const important = all.filter(e => IMPORTANT.has(e?.kind)).slice(0, 12);
  const row = (record, scope) => {
    const e = record && typeof record === 'object' ? record : {};
    const ids = Array.isArray(e.ids) ? e.ids : [];
    // Normalization is local only; old/error records are still visible and never repaired here.
    const text = eventText({ birds }, { ...e, ids, data: e.data || {} });
    const date = typeof e.at === 'number' && Number.isFinite(e.at) ? new Date(e.at) : null;
    const validDate = date && Number.isFinite(date.getTime());
    const legacy=Number(e.id?.slice(1))<=(world.clock?.legacyEventMax??-1);
    const dateLabel = validDate ? date.toLocaleString('ja-JP')+(legacy?'（旧時計の記録）':'') : '日時の記録なし';
    const subject = birds.find(b => b.id === ids[0]);
    const stage = e.kind === 'egg' ? 'egg' : e.kind === 'hatch' ? 'chick' : e.kind === 'grow' && ['chick','juvenile','adult'].includes(e.data?.stage) ? e.data.stage : subject?.stage;
    // Pass only copied visual fields, not a mutable reference to a saved bird.
    const art = scope === 'milestone' && subject ? portrait({ id: subject.id, name: subject.name, color: subject.color, stage }) : '';
    const image = scope === 'milestone' ? (art ? `<figure class="diary-paper-portrait"><div aria-hidden="true">${art}</div><figcaption>${esc(subject.name)}</figcaption></figure>` : `<p class="diary-paper-no-portrait">${esc(subject?.name || '文鳥')}の記録</p>`) : '';
    return `<li class="diary-paper-entry"><time${validDate ? ` datetime="${date.toISOString()}"` : ''}>${esc(day(e.tick))}<span class="diary-paper-date">${esc(dateLabel)}</span></time><p class="diary-paper-event">${esc(text)}</p>${image}<details data-game-details="diary-${scope}-${esc(e.id)}"><summary>くわしく</summary><p>${esc(e.condition)}。${esc(e.result)}。</p><p>${esc(dateLabel)}</p></details>${CARD.has(e.kind) ? `<button type="button" data-game-event-art="${esc(e.id)}">記念カード</button>` : ''}</li>`;
  };
  return `<section class="diary-paper"><header class="diary-paper-heading"><h3>文鳥たちの日記</h3><p>大切なできごと</p></header><ol class="game-diary diary-paper-pages">${important.map(e => row(e, 'milestone')).join('') || '<li class="diary-paper-empty">家族の節目が、ここに残ります。</li>'}</ol><details class="game-full-diary" data-game-details="full-diary"><summary>すべての日記 · ${all.length}件</summary><ol class="game-diary diary-paper-all">${all.map(e => row(e, 'all')).join('')}</ol><p class="game-small">日常は新しい240件、大切な出来事はずっと保存します。名前と家系は名簿にも残ります。</p></details></section>`;
}
