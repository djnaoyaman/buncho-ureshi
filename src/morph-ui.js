/**
 * Photo-first Java sparrow color atlas. Pure renderers have no DOM dependencies.
 * All prose and observations come from the supplied, reviewed data inventory.
 */
export const escapeMorphHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const E = escapeMorphHTML;
const list = value => Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
const fieldText = value => typeof value === 'string' ? value : value?.text || value?.value || value?.description || '';
const basicPlain = value => String(value ?? '').replace(/<rt>[\s\S]*?<\/rt>/g, '').replace(/<rp>[\s\S]*?<\/rp>/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
/** Only explicitly authored *Ruby fields can emit these six attribute-free tags. */
export function renderMorphRuby(value) {
  return String(value ?? '').split(/(<\/?(?:ruby|rt|rp)>)/g).map(token => /^<\/?(?:ruby|rt|rp)>$/.test(token) ? token : E(token)).join('');
}
const rich = (obj, key) => obj?.[key + 'Ruby'] ? renderMorphRuby(obj[key + 'Ruby']) : E(obj?.[key] ?? '');
const sourceURL = value => {
  try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
};
function settings(options = {}) {
  const base = /^\/(?!\/)[^?#:]*$/.test(options.base || '') ? options.base.replace(/\/?$/, '/') : '/buncho-ureshi/';
  return { ...options, base, route: 'colors/' };
}
const atlasURL = (options, id = '') => settings(options).base + 'colors/' + (id ? encodeURIComponent(id) + '/' : '');
function assetURL(value, options) {
  const text = String(value || '');
  if (/^https?:\/\//.test(text)) return sourceURL(text);
  if (!text || text.includes('..') || /[\u0000-\u0020\\:]/.test(text) || text.startsWith('//')) return '';
  const { base } = settings(options);
  return text.startsWith(base) ? text : base + text.replace(/^\//, '');
}
function externalLink(url, label) {
  const safe = sourceURL(url);
  return safe ? `<a href="${E(safe)}" target="_blank" rel="noopener noreferrer">${E(label)}</a>` : E(label);
}
function photoInventory(data) { return list(data.photos || data.photoInventory); }
function profiles(data) { return list(data.profiles || data.morphs); }
function terms(data) { return list(data.terms || data.terminology); }
const profileName = profile => profile?.name || profile?.title || profile?.label || profile?.id || '';
const colorProfiles = data => profiles(data).filter(profile => profile.kind !== 'age-comparison');
const profileNameHTML = profile => profile.nameRuby ? renderMorphRuby(profile.nameRuby) : profile.titleRuby ? renderMorphRuby(profile.titleRuby) : E(profileName(profile));
const partRuby = value => E(value).replace(/[頭背翼胸尾目]/g, char => `<ruby>${char}<rt>${({頭:'あたま',背:'せ',翼:'つばさ',胸:'むね',尾:'お',目:'め'})[char]}</rt></ruby>`);
const featureRows = profile => Array.isArray(profile.features) ? profile.features : Object.entries(profile.features || {}).map(([label, value]) => ({ label, value }));
function resolveSources(refs, data) {
  const catalog = list(data.sources);
  return list(refs).map(ref => typeof ref === 'string' ? catalog.find(source => source.id === ref) : ref).filter(Boolean);
}
function sourceSection(refs, data, checkedAt, heading = true) {
  const sources = resolveSources(refs, data);
  return `<details class="morph-research"><summary>${heading ? '調べた資料' : 'この項目の資料'}</summary>${sources.length ? `<ol class="morph-source-list">${sources.map(source => `<li>${externalLink(source.url || source.source, source.title || source.name || '参照資料')}${source.author ? ` — ${E(source.author)}` : ''}${source.note ? `<br>${E(source.note)}` : ''}</li>`).join('')}</ol>` : '<p class="morph-checked">この項目の出典は、写真の元ページと図鑑の素材台帳をご覧ください。</p>'}${checkedAt ? `<p class="morph-checked"><ruby>確認日<rt>かくにんび</rt></ruby>：<time datetime="${E(checkedAt)}">${E(checkedAt)}</time></p>` : ''}</details>`;
}
function paragraphList(values, className = '') {
  const items = list(values);
  return items.length ? `<ul${className ? ` class="${E(className)}"` : ''}>${items.map(value => `<li>${value?.textRuby ? renderMorphRuby(value.textRuby) : E(fieldText(value))}</li>`).join('')}</ul>` : '';
}
function flourish() {
  return '<svg class="morph-flourish" viewBox="0 0 480 40" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.3"><path d="M15 28C75 5 120 33 188 19S307 1 465 28M240 17C224-7 210 7 240 23C270 7 256-7 240 17"/><path d="M83 20C65 1 58 12 83 23M117 22C131 2 142 12 117 25M365 21C350 2 339 11 365 25M398 20C415 2 425 12 398 23"/></g></svg>';
}
function breadcrumb(profile, options) {
  const base = settings(options).base;
  return `<nav aria-label="現在地"><ol class="morph-breadcrumb"><li><a href="${E(base)}">トップ</a></li><li aria-hidden="true">／</li><li>${profile ? `<a href="${E(atlasURL(options))}"><ruby>羽色<rt>はねいろ</rt></ruby>ずかん</a>` : '<span aria-current="page"><ruby>羽色<rt>はねいろ</rt></ruby>ずかん</span>'}</li>${profile ? `<li aria-hidden="true">／</li><li><span aria-current="page">${profileNameHTML(profile)}</span></li>` : ''}</ol></nav>`;
}
function photoReference(profile) {
  return profile.photo || { photoId: profile.photoId || profile.heroPhotoId || list(profile.photoIds)[0], caption: profile.photoCaption, captionRuby: profile.photoCaptionRuby, caveat: profile.photoCaveat, evidenceLabel: profile.photoEvidenceLabel };
}
/** Full-source photo, never object-fit:cover; missing media is an explicit textual gap. */
export function renderMorphPhoto(reference, data, options = {}) {
  const ref = typeof reference === 'string' ? { photoId: reference } : reference || {};
  const photo = photoInventory(data).find(item => item.id === (ref.photoId || ref.id));
  const src = photo && assetURL(photo.src, options);
  if (!photo || !src) return `<div class="morph-empty-photo" role="note"><strong><ruby>確認<rt>かくにん</rt></ruby>できる<ruby>写真<rt>しゃしん</rt></ruby>がありません</strong><p>${E(ref.gap || ref.caveat || 'この特徴を確かめられる実写写真は、今回の資料にはありません。別の写真や生成画像で置き換えていません。')}</p></div>`;
  const width = Number.isFinite(photo.width) && photo.width > 0 ? Math.round(photo.width) : 1200;
  const height = Number.isFinite(photo.height) && photo.height > 0 ? Math.round(photo.height) : 900;
  const caption = ref.captionRuby ? renderMorphRuby(ref.captionRuby) : E(ref.caption || photo.caption || photo.alt || '');
  const caution = ref.caveat || photo.caveat || photo.identityNote || '';
  const credit = photo.credit || photo.author || '作者は元ページを参照';
  const licenseUrl = photo.licenseUrl?.replace(/^http:\/\/creativecommons\.org\//, 'https://creativecommons.org/');
  return `<figure class="morph-photo${options.primary ? ' morph-photo--primary' : ''}">${ref.evidenceLabel ? `<p class="morph-observation-label">${E(ref.evidenceLabel)}</p>` : ''}<div class="morph-image-wrap"><img src="${E(src)}" alt="${E(ref.alt || photo.alt || photo.title || '')}" width="${width}" height="${height}" loading="${options.eager ? 'eager' : 'lazy'}" decoding="async"${options.eager ? ' fetchpriority="high"' : ''}></div><figcaption>${caption ? `<p class="morph-photo-description">${caption}</p>` : ''}${caution ? `<p class="morph-observation-label">${ref.caveatRuby ? renderMorphRuby(ref.caveatRuby) : E(caution)}</p>` : ''}<p class="morph-credit"><span>${E(credit)}</span><span aria-hidden="true">·</span><span>${externalLink(licenseUrl, photo.license || '利用条件')}</span><span aria-hidden="true">·</span><span>${externalLink(photo.source, '写真の元ページ')}</span></p><details><summary><ruby>写真<rt>しゃしん</rt></ruby>の<ruby>出典<rt>しゅってん</rt></ruby>・<ruby>加工<rt>かこう</rt></ruby>について</summary><dl><dt>作品名</dt><dd>${E(photo.title || photo.alt || '')}</dd><dt>作者</dt><dd>${E(photo.author || '')}</dd><dt>利用条件</dt><dd>${externalLink(licenseUrl, photo.license || '')}</dd><dt>元ページ</dt><dd>${externalLink(photo.source, photo.source || '')}</dd>${photo.modifications ? `<dt>加工</dt><dd>${E(photo.modifications)}</dd>` : ''}${photo.acquiredAt ? `<dt>取得日</dt><dd>${E(photo.acquiredAt)}</dd>` : ''}</dl></details></figcaption></figure>`;
}
function featuresHTML(profile) {
  const rows = featureRows(profile);
  return rows.length ? `<dl class="morph-keypoints">${rows.map(row => `<div class="morph-keypoint"><dt>${row.labelRuby ? renderMorphRuby(row.labelRuby) : E(row.label || row.name || '')}</dt><dd>${row.valueRuby ? renderMorphRuby(row.valueRuby) : E(row.value || row.text || '')}</dd></div>`).join('')}</dl>` : '';
}
function taxonomyHTML(data) {
  const taxonomy = data.taxonomy || {};
  const title = taxonomy.titleRuby ? renderMorphRuby(taxonomy.titleRuby) : E(taxonomy.title || '種類の名前と、羽色の名前は別のもの');
  return `<aside class="morph-notice"><strong>${title}</strong><p>${taxonomy.summaryRuby ? renderMorphRuby(taxonomy.summaryRuby) : E(taxonomy.summary || 'ここでは文鳥という同じ種の、飼育下での羽色・模様の呼び名を比べます。羽色の呼び名を、別の鳥の種と混同しないようにしましょう。')}</p>${taxonomy.detail ? `<p>${E(taxonomy.detail)}</p>` : ''}${taxonomy.scientificName ? `<p><ruby>学名<rt>がくめい</rt></ruby>：<i lang="la">${E(taxonomy.scientificName)}</i></p>` : ''}</aside>`;
}
function searchable(profile) {
  return basicPlain([profileName(profile), profile.nameRuby, profile.summary, profile.summaryRuby, ...list(profile.aliases), ...list(profile.tags), ...featureRows(profile).map(row => row.value || row.text), ...list(profile.diagnostics).map(fieldText), ...list(profile.levels).map(level => level.text), ...list(profile.juvenileNotes).map(fieldText)].join(' ')).normalize('NFKC').toLocaleLowerCase('ja');
}
export function filterMorphProfiles(data, query = '', filter = 'all') {
  const text = String(query).trim().normalize('NFKC').toLocaleLowerCase('ja');
  return colorProfiles(data).filter(profile => (!text || searchable(profile).includes(text)) && (filter === 'all' || profile.id === filter || profile.group === filter || list(profile.filterTags || profile.tags).includes(filter)));
}
function card(profile, data, options) {
  return `<article class="morph-card" data-morph-card="${E(profile.id)}">${renderMorphPhoto(photoReference(profile), data, options)}<div class="morph-card-body"><h3><a href="${E(atlasURL(options, profile.id))}">${profileNameHTML(profile)}</a></h3>${profile.subtitle ? `<p class="morph-card-subtitle">${E(profile.subtitle)}</p>` : ''}<p class="morph-card-summary">${rich(profile, 'summary')}</p><div class="morph-card-actions"><a href="${E(atlasURL(options, profile.id))}"><ruby>写真<rt>しゃしん</rt></ruby>でくわしく<ruby>見<rt>み</rt></ruby>る →</a><button type="button" data-morph-compare-id="${E(profile.id)}">この<ruby>文鳥<rt>ぶんちょう</rt></ruby>とくらべる</button></div></div></article>`;
}
export function renderMorphCards(data, options = {}) {
  const found = filterMorphProfiles(data, options.query, options.filter);
  return found.length ? found.map(profile => card(profile, data, options)).join('') : '<p class="morph-notice">そのことばでは<ruby>見<rt>み</rt></ruby>つかりませんでした。「しぼりこみをもどす」で、すべて<ruby>見<rt>み</rt></ruby>られます。</p>';
}
export function renderMorphComparison(ids, data, options = {}) {
  const selected = list(ids).map(id => profiles(data).find(profile => profile.id === id)).filter(Boolean).slice(0, 2);
  if (selected.length !== 2 || selected[0].id === selected[1].id) return '<p class="morph-notice" role="status">ちがう<ruby>名前<rt>なまえ</rt></ruby>を２つ<ruby>選<rt>えら</rt></ruby>んで、<ruby>見<rt>み</rt></ruby>くらべてみよう。</p>';
  return `<div class="morph-comparison-grid">${selected.map(profile => `<article class="morph-comparison">${renderMorphPhoto(photoReference(profile), data, options)}<h3>${profileNameHTML(profile)}</h3><p>${rich(profile, 'summary')}</p>${featuresHTML(profile)}${paragraphList(profile.compareCautions || profile.uncertainties)}<a href="${E(atlasURL(options, profile.id))}">${E(profileName(profile))}をくわしく<ruby>見<rt>み</rt></ruby>る →</a></article>`).join('')}</div><p class="morph-compare-note"><ruby>写真<rt>しゃしん</rt></ruby>の<ruby>光<rt>ひかり</rt></ruby>や<ruby>角度<rt>かくど</rt></ruby>、<ruby>成長<rt>せいちょう</rt></ruby>の<ruby>段階<rt>だんかい</rt></ruby>はちがいます。<ruby>色<rt>いろ</rt></ruby>だけで<ruby>血筋<rt>ちすじ</rt></ruby>や<ruby>遺伝子<rt>いでんし</rt></ruby>を<ruby>決<rt>き</rt></ruby>めつけません。</p>`;
}
function ageSection(data, options, profile) {
  const comparisons = profile ? profile.ageComparison : data.juvenileComparison;
  const items = list(comparisons?.items || comparisons?.cards || comparisons);
  const notes = profile?.juvenileNotes || comparisons?.notes;
  if (!items.length && !list(notes).length && !list(profile?.adultNotes).length) return '';
  return `<section class="morph-section" id="morph-growth"><h2>こどもと、おとな。<ruby>羽<rt>はね</rt></ruby>の<ruby>変化<rt>へんか</rt></ruby></h2>${comparisons?.summary ? `<p class="morph-section-lead">${rich(comparisons, 'summary')}</p>` : ''}${items.length ? `<div class="morph-age-grid">${items.map(item => `<article class="morph-age-card"><h3>${item.titleRuby ? renderMorphRuby(item.titleRuby) : E(item.title || item.label || '')}</h3>${renderMorphPhoto(item.photo || item, data, options)}${item.text || item.textRuby ? `<p>${rich(item, 'text')}</p>` : ''}</article>`).join('')}</div>` : ''}${list(profile?.adultNotes).length ? `<h3><ruby>成鳥<rt>せいちょう</rt></ruby>を<ruby>見<rt>み</rt></ruby>るとき</h3>${paragraphList(profile.adultNotes)}` : ''}${paragraphList(notes)}${comparisons?.profileId ? `<a href="${E(atlasURL(options, comparisons.profileId))}"><ruby>幼鳥<rt>ようちょう</rt></ruby>と<ruby>成鳥<rt>せいちょう</rt></ruby>の<ruby>解説<rt>かいせつ</rt></ruby>を<ruby>読<rt>よ</rt></ruby>む →</a>` : ''}</section>`;
}
function termsSection(data) {
  const items = terms(data);
  if (!items.length) return '';
  return `<section class="morph-section" id="morph-terms"><h2><ruby>珍<rt>めずら</rt></ruby>しい<ruby>呼<rt>よ</rt></ruby>び<ruby>名<rt>な</rt></ruby>の、ことば<ruby>帳<rt>ちょう</rt></ruby></h2><p class="morph-section-lead"><ruby>名前<rt>なまえ</rt></ruby>があることと、その<ruby>特徴<rt>とくちょう</rt></ruby>を<ruby>確<rt>たし</rt></ruby>かめられることは<ruby>別<rt>べつ</rt></ruby>です。ここは<ruby>写真<rt>しゃしん</rt></ruby>つきの５つの<ruby>解説<rt>かいせつ</rt></ruby>とは<ruby>分<rt>わ</rt></ruby>けて<ruby>読<rt>よ</rt></ruby>んでください。</p><div class="morph-terms">${items.map(term => `<article class="morph-term"><h3>${term.nameRuby ? renderMorphRuby(term.nameRuby) : E(term.name || term.title || '')}</h3><p>${term.descriptionRuby ? renderMorphRuby(term.descriptionRuby) : E(term.description || term.summary || '')}</p>${term.uncertainty ? `<p>${E(term.uncertainty)}</p>` : ''}<p class="morph-gap">${term.photoGapRuby ? renderMorphRuby(term.photoGapRuby) : E(term.photoGap || term.gap || 'この呼び名を裏づける、利用条件まで確認済みの実写写真はありません。生成画像や別の羽色の写真で置き換えていません。')}</p>${term.sources?.length ? sourceSection(term.sources, data, term.checkedAt, false) : ''}</article>`).join('')}</div></section>`;
}
function levelTitle(level) { return ({first:'まず<ruby>見<rt>み</rt></ruby>る',basic:'<ruby>基本<rt>きほん</rt></ruby>を<ruby>知<rt>し</rt></ruby>る',deep:'もっと<ruby>調<rt>しら</rt></ruby>べる'})[level.id] || E(level.title); }
function learningSections(profile) {
  const levels = list(profile.levels);
  if (!levels.length) return '';
  return `<section class="morph-section morph-learning" id="morph-learning"><h2><ruby>読<rt>よ</rt></ruby>む<ruby>深<rt>ふか</rt></ruby>さを<ruby>選<rt>えら</rt></ruby>ぼう</h2>${levels.map(level => level.id === 'first' ? `<div class="morph-learning-first"><h3>${levelTitle(level)}</h3><p>${level.textRuby ? renderMorphRuby(level.textRuby) : E(level.text)}</p></div>` : `<details${level.id === 'basic' ? ' open' : ''}><summary>${levelTitle(level)}</summary><p>${level.textRuby ? renderMorphRuby(level.textRuby) : E(level.text)}</p></details>`).join('')}</section>`;
}
function introductionSections(data) {
  const entries = list(data.introductions);
  return entries.length ? `<section class="morph-section" id="morph-reading"><h2><ruby>写真<rt>しゃしん</rt></ruby>を<ruby>読<rt>よ</rt></ruby>むときの、やくそく</h2><div class="morph-reading-grid">${entries.map(entry => `<details><summary>${E(entry.title)}</summary><p>${entry.textRuby ? renderMorphRuby(entry.textRuby) : E(entry.text)}</p></details>`).join('')}</div></section>` : '';
}
function glossarySection(data) {
  const entries = list(data.glossary);
  return entries.length ? `<section class="morph-section" id="morph-glossary"><h2><ruby>小<rt>ちい</rt></ruby>さな<ruby>用語集<rt>ようごしゅう</rt></ruby></h2><dl class="morph-glossary">${entries.map(entry => `<div><dt><ruby>${E(entry.term)}<rt>${E(entry.reading)}</rt></ruby></dt><dd>${E(entry.meaning)}</dd></div>`).join('')}</dl></section>` : '';
}
function compareOptions(data, selectedId) {
  return profiles(data).map(profile => `<option value="${E(profile.id)}"${profile.id === selectedId ? ' selected' : ''}>${E(profileName(profile) + (profile.reading ? ' / ' + profile.reading : ''))}</option>`).join('');
}
function initialComparison(data, options = {}) {
  const all = profiles(data);
  const first = all.find(profile => profile.id === options.compareIds?.[0]) || all[0];
  const second = all.find(profile => profile.id === options.compareIds?.[1] && profile.id !== first?.id) || all.find(profile => profile.id === 'white' && profile.id !== first?.id) || all.find(profile => profile.id !== first?.id);
  return [first?.id, second?.id].filter(Boolean);
}
export function renderMorphOverview(data, options = {}) {
  const all = colorProfiles(data), selected = initialComparison(data, options), url = atlasURL(options);
  const filters = list(data.filters).length ? data.filters : all.map(profile => ({ value: profile.id, label: profileName(profile) + (profile.reading ? ' / ' + profile.reading : '') }));
  const heroProfile = all.find(profile => profile.id === 'white') || all[0];
  const heading = data.titleRuby ? renderMorphRuby(data.titleRuby) : '<ruby>文鳥<rt>ぶんちょう</rt></ruby>の<ruby>羽色<rt>はねいろ</rt></ruby>ずかん';
  const count = filterMorphProfiles(data, options.query, options.filter).length;
  return `<div class="morph-atlas" data-morph-view="overview">${breadcrumb(null, options)}<div class="morph-overview-hero"><header class="morph-intro"><p class="morph-kicker">FEATHERS / A LIVING COLOUR ATLAS</p><h1>${heading}</h1><p><ruby>黒<rt>くろ</rt></ruby>、<ruby>白<rt>しろ</rt></ruby>、やわらかな<ruby>灰色<rt>はいいろ</rt></ruby>。<br><ruby>写真<rt>しゃしん</rt></ruby>を<ruby>大<rt>おお</rt></ruby>きく<ruby>見<rt>み</rt></ruby>て、<ruby>羽<rt>はね</rt></ruby>のちがいを<ruby>探<rt>さが</rt></ruby>そう。</p>${flourish()}</header></div>${data.coverage?.claim ? `<p class="morph-coverage">${data.coverage.claimHtml ? renderMorphRuby(data.coverage.claimHtml) : E(data.coverage.claim)}</p>` : ''}${taxonomyHTML(data)}<nav class="morph-toc" aria-label="羽色ずかんの目次"><a href="${E(url)}#morph-profiles"><ruby>写真<rt>しゃしん</rt></ruby>から<ruby>探<rt>さが</rt></ruby>す</a><a href="${E(url)}#morph-compare">２つをくらべる</a><a href="${E(url)}#morph-growth">こどもと、おとな</a><a href="${E(url)}#morph-terms">ことば<ruby>帳<rt>ちょう</rt></ruby></a><a href="${E(url)}#morph-sources"><ruby>資料<rt>しりょう</rt></ruby></a></nav><section class="morph-section" id="morph-profiles"><h2><ruby>写真<rt>しゃしん</rt></ruby>から、${all.length}つの<ruby>解説<rt>かいせつ</rt></ruby>へ</h2><p class="morph-section-lead"><ruby>見<rt>み</rt></ruby>える<ruby>模様<rt>もよう</rt></ruby>と、<ruby>資料<rt>しりょう</rt></ruby>で<ruby>確認<rt>かくにん</rt></ruby>できた<ruby>名前<rt>なまえ</rt></ruby>を<ruby>分<rt>わ</rt></ruby>けて<ruby>書<rt>か</rt></ruby>いています。<ruby>写真<rt>しゃしん</rt></ruby>は、<ruby>体<rt>からだ</rt></ruby>の<ruby>特徴<rt>とくちょう</rt></ruby>が<ruby>欠<rt>か</rt></ruby>けないように<ruby>表示<rt>ひょうじ</rt></ruby>しています。</p><form class="morph-filterbar" data-morph-filter-form role="search"><label for="morph-search"><ruby>色<rt>いろ</rt></ruby>・<ruby>模様<rt>もよう</rt></ruby>・ことばで<ruby>探<rt>さが</rt></ruby>す<input id="morph-search" data-morph-query type="search" value="${E(options.query || '')}" maxlength="80" placeholder="白、まだら、幼鳥…" autocomplete="off"></label><label for="morph-filter"><ruby>呼<rt>よ</rt></ruby>び<ruby>名<rt>な</rt></ruby>でしぼる<select id="morph-filter" data-morph-filter><option value="all">すべての かいせつ</option>${filters.map(filter => `<option value="${E(filter.value || filter.id)}"${options.filter === (filter.value || filter.id) ? ' selected' : ''}>${E(filter.label || filter.name)}</option>`).join('')}</select></label><button type="button" data-morph-reset>しぼりこみをもどす</button></form><p class="morph-result-count" data-morph-result-count role="status" aria-live="polite">${count}件の<ruby>解説<rt>かいせつ</rt></ruby></p><div class="morph-gallery-nav"><button type="button" data-morph-page="-1" aria-label="前の羽色へ">← 前へ</button><span data-morph-position role="status">1 / ${count}</span><button type="button" data-morph-page="1" aria-label="次の羽色へ">次へ →</button></div><div class="morph-cards" data-morph-results tabindex="0" aria-label="羽色の写真。横にスワイプして選べます">${renderMorphCards(data, options)}</div></section><details class="morph-section morph-compare-panel" id="morph-compare"><summary>２つの羽色をくらべる</summary><h2>２つ<ruby>並<rt>なら</rt></ruby>べて、<ruby>見<rt>み</rt></ruby>くらべる</h2><p class="morph-section-lead"><ruby>頭<rt>あたま</rt></ruby>、ほお、<ruby>翼<rt>つばさ</rt></ruby>。どこがちがうかな？ <ruby>名前<rt>なまえ</rt></ruby>を<ruby>選<rt>えら</rt></ruby>ぶと<ruby>写真<rt>しゃしん</rt></ruby>と<ruby>説明<rt>せつめい</rt></ruby>が<ruby>切<rt>き</rt></ruby>り<ruby>替<rt>か</rt></ruby>わります。</p><div class="morph-compare-controls"><label for="morph-compare-a">１つめの<ruby>文鳥<rt>ぶんちょう</rt></ruby><select id="morph-compare-a" data-morph-compare="a">${compareOptions(data, selected[0])}</select></label><span class="morph-compare-mark" aria-hidden="true">と</span><label for="morph-compare-b">２つめの<ruby>文鳥<rt>ぶんちょう</rt></ruby><select id="morph-compare-b" data-morph-compare="b">${compareOptions(data, selected[1])}</select></label><button type="button" data-morph-compare-reset>くらべる組み合わせをもどす</button></div><p class="morph-live" data-morph-compare-status role="status" aria-live="polite"></p><div data-morph-comparison></div></details>${introductionSections(data)}${ageSection(data, options)}${termsSection(data)}${glossarySection(data)}<section class="morph-section" id="morph-sources">${sourceSection(data.overviewSources || data.sources, data, data.checkedAt || data.checkedDate)}</section><noscript><p class="morph-noscript">写真と解説はこのまま読めます。検索・しぼりこみ・比較の切り替え・読み上げにはJavaScriptが必要です。</p></noscript></div>`;
}
export function renderMorphProfile(id, data, options = {}) {
  const profile = profiles(data).find(item => item.id === id);
  if (!profile) return `<div class="morph-atlas">${breadcrumb(null, options)}<h1>この<ruby>羽色<rt>はねいろ</rt></ruby>の<ruby>解説<rt>かいせつ</rt></ruby>は<ruby>見<rt>み</rt></ruby>つかりません</h1><a href="${E(atlasURL(options))}"><ruby>羽色<rt>はねいろ</rt></ruby>ずかんへ<ruby>戻<rt>もど</rt></ruby>る</a></div>`;
  const url = atlasURL(options, profile.id), adult = list(profile.adultNotes), juvenile = list(profile.juvenileNotes);
  return `<article class="morph-atlas" data-morph-view="profile" data-morph-profile="${E(profile.id)}">${breadcrumb(profile, options)}<header><p class="morph-kicker">FEATHER PORTRAIT / ${E(profile.id.replace(/-/g, ' '))}</p><h1 class="morph-profile-title">${profileNameHTML(profile)}</h1>${profile.subtitle ? `<p class="morph-profile-label">${E(profile.subtitle)}</p>` : ''}</header><div class="morph-detail-hero">${renderMorphPhoto(photoReference(profile), data, { ...options, primary: true, eager: true })}<div><p class="morph-summary">${rich(profile, 'summary')}</p>${profile.identityNote ? `<aside class="morph-notice"><p>${E(profile.identityNote)}</p></aside>` : ''}<div class="morph-audio"><button type="button" data-morph-speak="${E(profile.id)}" aria-label="${E(profileName(profile))}の説明を読み上げる"><ruby>説明<rt>せつめい</rt></ruby>を<ruby>聞<rt>き</rt></ruby>く</button><button type="button" data-morph-stop><ruby>止<rt>と</rt></ruby>める</button></div><p class="morph-live" data-morph-speech-status role="status" aria-live="polite"></p>${profile.mission || profile.missionRuby ? `<aside class="morph-notice"><strong><ruby>写真<rt>しゃしん</rt></ruby>の<ruby>観察<rt>かんさつ</rt></ruby>ミッション</strong><p>${rich(profile, 'mission')}</p></aside>` : ''}</div></div>${taxonomyHTML(data)}<nav class="morph-toc" aria-label="この解説の目次"><a href="${E(url)}#morph-features"><ruby>体<rt>からだ</rt></ruby>の<ruby>特徴<rt>とくちょう</rt></ruby></a><a href="${E(url)}#morph-observe"><ruby>見分<rt>みわ</rt></ruby>けるときのヒント</a>${adult.length || juvenile.length || profile.ageComparison ? `<a href="${E(url)}#morph-growth"><ruby>成長<rt>せいちょう</rt></ruby>のちがい</a>` : ''}<a href="${E(url)}#morph-sources"><ruby>資料<rt>しりょう</rt></ruby></a></nav><section class="morph-section" id="morph-features"><h2><ruby>写真<rt>しゃしん</rt></ruby>と<ruby>体<rt>からだ</rt></ruby>の<ruby>特徴<rt>とくちょう</rt></ruby></h2>${featuresHTML(profile)}${profile.photoDetails ? paragraphList(profile.photoDetails) : ''}${list(profile.extraPhotos).length ? `<div class="morph-age-grid">${profile.extraPhotos.map(photo => renderMorphPhoto(photo, data, options)).join('')}</div>` : ''}</section>${learningSections(profile)}<section class="morph-section" id="morph-observe"><div class="morph-detail-columns"><div><h2><ruby>見分<rt>みわ</rt></ruby>けるときのヒント</h2>${paragraphList(profile.diagnostics)}${profile.detail || profile.detailRuby ? `<p>${rich(profile, 'detail')}</p>` : ''}</div><aside><h2><ruby>写真<rt>しゃしん</rt></ruby>だけでは、わからないこと</h2>${paragraphList(profile.uncertainties)}<p class="morph-compare-note"><ruby>名前<rt>なまえ</rt></ruby>や<ruby>見<rt>み</rt></ruby>た<ruby>目<rt>め</rt></ruby>だけで、<ruby>病気<rt>びょうき</rt></ruby>・<ruby>性別<rt>せいべつ</rt></ruby>・<ruby>血筋<rt>ちすじ</rt></ruby>を<ruby>決<rt>き</rt></ruby>めつけないでね。</p></aside></div></section>${ageSection(data, options, profile)}<section class="morph-section" id="morph-sources">${sourceSection(profile.sources, data, profile.checkedAt || profile.checkedDate || data.checkedAt)}</section><nav class="morph-related" aria-label="ほかの羽色を調べる"><a href="${E(atlasURL(options))}">← <ruby>羽色<rt>はねいろ</rt></ruby>ずかんへ</a>${profiles(data).filter(item => item.id !== id).map(item => `<a href="${E(atlasURL(options, item.id))}">${profileNameHTML(item)}</a>`).join('')}</nav><noscript><p class="morph-noscript">写真と解説はこのまま読めます。読み上げにはJavaScriptが必要です。</p></noscript></article>`;
}
export function buildMorphSearchIndex(data, options = {}) {
  return profiles(data).map(profile => ({ id: profile.id, title: profileName(profile), summary: basicPlain(profile.summaryRuby || profile.summary), text: searchable(profile), url: atlasURL(options, profile.id), photoId: photoReference(profile).photoId }));
}
export function morphSpeechText(id, data) {
  const profile = profiles(data).find(item => item.id === id);
  if (!profile) return '';
  return basicPlain([profileName(profile), profile.summaryRuby || profile.summary, ...featureRows(profile).map(row => (row.label || row.name || '') + '。' + (row.valueRuby || row.value || row.text || '')), ...list(profile.uncertainties).map(fieldText)].join('。'));
}
/** One scoped listener of each type. Call teardown before replacing the root. */
export function bindMorphAtlas(root, { data, speak, stopSpeech, onAnnounce, ...options } = {}) {
  if (!root || !data) return () => {};
  const query = root.querySelector('[data-morph-query]'), filter = root.querySelector('[data-morph-filter]');
  const a = root.querySelector('[data-morph-compare="a"]'), b = root.querySelector('[data-morph-compare="b"]');
  // Keep controls aligned with the rendered cards after browser form restoration.
  if (a && b) { const pair = initialComparison(data, options); a.value = pair[0]; b.value = pair[1]; }
  let active = true, speaking = false;
  const announce = text => { if (typeof onAnnounce === 'function') onAnnounce(text); };
  const gallery = root.querySelector('[data-morph-results]');
  const comparisonPanel = root.querySelector('#morph-compare');
  function galleryPosition() {
    const cards = [...(gallery?.querySelectorAll('[data-morph-card]') || [])];
    const left = gallery?.getBoundingClientRect().left || 0;
    const index = cards.length ? cards.reduce((best, card, i) => Math.abs(card.getBoundingClientRect().left - left) < Math.abs(cards[best].getBoundingClientRect().left - left) ? i : best, 0) : 0;
    const label = root.querySelector('[data-morph-position]');
    if (label) label.textContent = `${cards.length ? index + 1 : 0} / ${cards.length}`;
    const prev = root.querySelector('[data-morph-page="-1"]'), next = root.querySelector('[data-morph-page="1"]');
    if (prev) prev.disabled = !cards.length || index === 0;
    if (next) next.disabled = !cards.length || index === cards.length - 1;
    return { cards, index };
  }
  function comparisonToggle() {
    if (comparisonPanel?.open) updateComparison();
    else { const result = root.querySelector('[data-morph-comparison]'); if (result) result.innerHTML = ''; }
  }

  function updateFilters() {
    if (!active || !query || !filter) return;
    const result = root.querySelector('[data-morph-results]'), count = root.querySelector('[data-morph-result-count]');
    const found = filterMorphProfiles(data, query.value, filter.value);
    if (result) result.innerHTML = renderMorphCards(data, { ...options, query: query.value, filter: filter.value });
    if (result) result.scrollLeft = 0;
    galleryPosition();
    if (count) count.innerHTML = `${found.length}<ruby>件<rt>けん</rt></ruby>の<ruby>解説<rt>かいせつ</rt></ruby>`;
  }
  function updateComparison() {
    if (!active || !a || !b) return;
    const result = root.querySelector('[data-morph-comparison]'), status = root.querySelector('[data-morph-compare-status]');
    if (result) result.innerHTML = renderMorphComparison([a.value, b.value], data, options);
    if (status) status.textContent = a.value === b.value ? 'ちがう名前を２つ選んでね。' : `${profileName(profiles(data).find(profile => profile.id === a.value))}と${profileName(profiles(data).find(profile => profile.id === b.value))}を並べました。`;
  }
  function click(event) {
    const page = event.target.closest?.('[data-morph-page]');
    if (page && root.contains(page)) {
      const { cards, index } = galleryPosition();
      const target = cards[Math.max(0, Math.min(cards.length - 1, index + Number(page.dataset.morphPage)))];
      if (gallery && target) {
        const reduced = root.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        gallery.scrollBy({ left: target.getBoundingClientRect().left - gallery.getBoundingClientRect().left, behavior: reduced ? 'auto' : 'smooth' });
      }
      return;
    }
    const resetComparison = event.target.closest?.('[data-morph-compare-reset]');
    if (resetComparison && root.contains(resetComparison) && a && b) { const pair = initialComparison(data, options); a.value = pair[0]; b.value = pair[1]; updateComparison(); a.focus(); return; }
    const compare = event.target.closest?.('[data-morph-compare-id]');
    if (compare && root.contains(compare) && a && b) {
      const id = compare.getAttribute('data-morph-compare-id');
      if (!profiles(data).some(profile => profile.id === id)) return;
      a.value = id;
      if (b.value === id) b.value = profiles(data).find(profile => profile.id !== id)?.id || '';
      if (comparisonPanel) comparisonPanel.open = true;
      updateComparison();
      root.querySelector('#morph-compare')?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
      a.focus({ preventScroll: true });
      return;
    }
    const reset = event.target.closest?.('[data-morph-reset]');
    if (reset && root.contains(reset) && query && filter) { query.value = ''; filter.value = 'all'; updateFilters(); query.focus(); return; }
    const play = event.target.closest?.('[data-morph-speak]');
    if (play && root.contains(play) && typeof speak === 'function') {
      const text = morphSpeechText(play.getAttribute('data-morph-speak'), data);
      if (!text) return;
      try {
        const result = speak(text); speaking = true;
        if (result?.catch) result.catch(() => { if (!active) return; const status = root.querySelector('[data-morph-speech-status]'); if (status) status.textContent = '読み上げを使えませんでした。文章はそのまま読めます。'; });
      } catch { const status = root.querySelector('[data-morph-speech-status]'); if (status) status.textContent = '読み上げを使えませんでした。文章はそのまま読めます。'; }
      return;
    }
    const stop = event.target.closest?.('[data-morph-stop]');
    if (stop && root.contains(stop) && typeof stopSpeech === 'function') { stopSpeech(); speaking = false; announce('読み上げを止めました。'); }
  }
  function input(event) { if (event.target === query) updateFilters(); }
  function change(event) { if (event.target === filter) updateFilters(); else if (event.target === a || event.target === b) updateComparison(); }
  function submit(event) { if (event.target.matches?.('[data-morph-filter-form]')) { event.preventDefault(); updateFilters(); } }
  gallery?.addEventListener('scroll', galleryPosition, { passive: true });
  comparisonPanel?.addEventListener('toggle', comparisonToggle);
  galleryPosition();
  root.addEventListener('click', click); root.addEventListener('input', input); root.addEventListener('change', change); root.addEventListener('submit', submit);
  return () => {
    if (!active) return; active = false;
    gallery?.removeEventListener('scroll', galleryPosition);
    comparisonPanel?.removeEventListener('toggle', comparisonToggle);
    root.removeEventListener('click', click); root.removeEventListener('input', input); root.removeEventListener('change', change); root.removeEventListener('submit', submit);
    if (speaking && typeof stopSpeech === 'function') stopSpeech();
  };
}

/** Adapt the authoritative morphAtlas schema without changing its observations. */
export function prepareMorphAtlas(atlas, photos = []) {
  const nameRuby = item => {
    const tokens = String(item.name || '').match(/[（）・／]|[^（）・／]+/g) || [];
    const readings = String(item.reading || '').split('・');
    const words = tokens.filter(token => !/^[（）・／]$/.test(token));
    if (words.length > 1 && words.length === readings.length) {
      let index = 0;
      return tokens.map(token => /^[（）・／]$/.test(token) ? E(token) : `<ruby>${E(token)}<rt>${E(readings[index++])}</rt></ruby>`).join('');
    }
    return item.nameHtml || (item.reading ? `<ruby>${E(item.name)}<rt>${E(item.reading)}</rt></ruby>` : E(item.name));
  };
  const normalized = list(atlas.profiles).map(profile => {
    const tips = list(profile.comparisonTips).map((text, i) => ({ text, textRuby: profile.comparisonTipsHtml?.[i] }));
    const refs = list(profile.photoIds).map(photoId => ({ photoId, caption: profile.photoNotes?.[photoId] || '', captionRuby: profile.photoNotesHtml?.[photoId], caveat: profile.confidence || '', caveatRuby: profile.confidenceHtml }));
    return {
      ...profile,
      nameRuby: nameRuby(profile), summaryRuby: profile.summaryHtml, missionRuby: profile.missionHtml,
      photo: refs[0], extraPhotos: refs.slice(1), photoCaveat: profile.confidence,
      features: list(profile.diagnostics).map(row => ({ label: row.part, labelRuby: partRuby(row.part), value: row.text, valueRuby: row.html })),
      diagnostics: tips, uncertainties: profile.confidence ? [{ text: profile.confidence, textRuby: profile.confidenceHtml }] : [],
      juvenileNotes: profile.ageNotes ? [{ text: profile.ageNotes, textRuby: profile.ageNotesHtml }] : [],
      levels: list(profile.levels).map(level => ({ ...level, textRuby: level.html })),
      checkedAt: profile.reviewedAt,
      aliases: [...list(profile.aliases), profile.reading || ''],
      subtitle: profile.kind === 'age-comparison' ? '羽色の品種ではなく、成長段階の比較' : '同じ文鳥という種の、色・模様の呼び名'
    };
  });
  const intro = list(atlas.introduction), first = intro.find(item => item.id === 'one-species') || intro[0];
  const juvenile = normalized.find(profile => profile.kind === 'age-comparison');
  return {
    ...atlas, photos, profiles: normalized, checkedAt: atlas.reviewedAt,
    titleRuby: atlas.title === "文鳥の種類・カラーバリエーション図鑑" ? '<ruby>文鳥<rt>ぶんちょう</rt></ruby>の<ruby>種類<rt>しゅるい</rt></ruby>・カラーバリエーション<ruby>図鑑<rt>ずかん</rt></ruby>' : atlas.titleReading ? `<ruby>${E(atlas.title)}<rt>${E(atlas.titleReading)}</rt></ruby>` : undefined,
    taxonomy: { title: first?.title || '', summary: first?.text || '', summaryRuby: first?.html },
    introductions: intro.filter(item => item !== first).map(item => ({ ...item, textRuby: item.html })),
    juvenileComparison: juvenile ? {
      summary: juvenile.summary, summaryRuby: juvenile.summaryRuby,
      items: list(juvenile.photoIds).map((photoId, index) => ({ title: `比べる写真 ${index + 1}`, photo: { photoId, caption: juvenile.photoNotes?.[photoId] || '', captionRuby: juvenile.photoNotesHtml?.[photoId], caveat: juvenile.confidence, caveatRuby: juvenile.confidenceHtml } })),
      notes: juvenile.juvenileNotes, profileId: juvenile.id
    } : null,
    terms: list(atlas.terminology).map(term => ({ ...term, nameRuby: nameRuby(term), description: term.text, descriptionRuby: term.html, photoGap: term.photoStatus, photoGapRuby: term.photoStatusHtml, checkedAt: term.reviewedAt }))
  };
}
