import {allBirds} from './world-birds.js';
/** Pure naming policy. Call only after the engine has validated the world.
 * Names are presentation, never identity. No story PRNG, clock, or global state.
 */
export const NAME_POLICY_VERSION = 1;
export const DEFAULT_BIRD_NAMES = Object.freeze(`
こはく すず わかば こむぎ つむぎ そら ふたば ひなた あんず しずく なずな くるみ
おもち しらたま だいふく きなこ あずき もなか あられ おはぎ かのこ みたらし さくらもち
ゆず みかん こなつ すだち かぼす いちご りんご もも すもも こけもも びわ かりん
うめ さくら すみれ たんぽぽ つばき ぼたん あやめ ききょう こすもす ひまわり なのはな れんげ
つくし よもぎ せり なでしこ あさがお ひるがお ゆうがお すずらん しろつめ むぎ いなほ こめ
ほたる こゆき みぞれ あらし はるかぜ そよかぜ こもれび あさひ ゆうひ あかつき かすみ おぼろ
つき ほし すばる ひかり きらり きらら ひより こはる はる なつ あき ふゆ
こふゆ こなみ なぎ しおん みなも せせらぎ こだま やまびこ つゆ あまね にじ わたぐも
わたあめ ましゅまろ ぷりん くっきー びすけ しふぉん かすてら みるく ここあ ばにら きゃらめる めーぷる
はちみつ しろっぷ まろん ぴすたちお あーもんど ここなつ しなもん しゅがー そると みんと はっか ちゃい
まっちゃ ほうじちゃ せんちゃ こうちゃ こーひー らて もか みるふぃーゆ たると どーなつ べーぐる すこーん
こっぺ くるみぱん あんぱん めろんぱん くりーむ ごま くろごま えだまめ そらまめ おまめ ひよこまめ らっかせい
すずめ つばめ ひばり ちどり うぐいす めじろ せきれい こまどり こるり かわせみ やまがら えなが
かえで もみじ いちょう けやき くすのき ひのき すぎ まつ たけ ささ かしわ くぬぎ
どんぐり まつぼっくり このは こえだ つぼみ はなびら わかくさ みどり あおば しんめ こがね あかね
あさつゆ ゆうなぎ しらゆき はつゆき はつね ことね すずね うたね かなで しらべ こまち こより
てまり こまり りぼん ぼたんゆき ゆきみ もちこ もちまる ふく まる まめ ぴの ぽぽ
`.trim().split(/\s+/u));

/** Short-form given names for future biological descendants of the original b1.
 * Keep the pool explicit and editable; existing names are never reassigned.
 * More than the world's 128 lifetime birds avoids numeric collision suffixes.
 */
export const DIRECT_LINE_BIRD_NAMES = Object.freeze(`
アル ベン サム マックス リズ ケイト ベス レオ ニック
アベ アディ アルフ アルビ アン アニー アンジー アート アーチー アイク
アレクス アレク イジー イヴ ウィル ウィリー ウォルト ウェス
エイミー エディ エル エリー エルザ エミー エム エヴァ オリー オズ
カル キャム キャシー キャット キム キット キキ クリス クレム
ケン ケニー コリー コニー コーディ ココ コール サリー サンディ シド
シンディ ジェイ ジェス ジェシー ジェニー ジム ジミー ジャック
ジュード ジュディ ジュール ジョー ジョーイ ジョニー ジル ジーン スー スージー
ステフ スタン スティヴ ヴィック ヴィン ヴィニー ダン ダニー デイヴ
ディー ティム ティミー テス テディ テリー トッド トニー トム トミー
ドム ドリー ドット ドッティ ナット ナンシー ニッキー ニール ネッド ネリー
ノーラ ノーム ノリー ハリー ハンク パット パティ パム バート バリー
バーニー ビー ビル ビリー フィル フィン フレッド フラン フランク フレディ
ペグ ペギー ペニー ベニー ベル ボブ ボビー ポリー マギー マット
マディ マイク ミック ミッキー ミミ ミリー メグ メル モリー モー
ラリー リック リッキー リッチ リッチー ルー ルーク ルディ ルビー レイ
レニー ロイ ロニー ロブ ロビー ロン ロージー ローリー
`.trim().split(/\s+/u));

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.codePointAt(0), 16777619) >>> 0;
  return value;
}
const comparisonName = name => name.normalize('NFKC').trim();
/** All birds count, including departed family members. Existing duplicate manual names stay intact. */
export function chooseDefaultBirdName(world, birdId) {
  return chooseFromPool(world, birdId, DEFAULT_BIRD_NAMES);
}
function chooseFromPool(world, birdId, pool, excludeOmochi = false) {
  const taken = new Set(allBirds(world).filter(b => b.id !== birdId).map(b => comparisonName(b.name)));
  const start = hash(`${world.worldId}\u0000${birdId}`) % pool.length;
  for (let offset = 0; offset < pool.length; offset++) {
    const name = pool[(start + offset) % pool.length];
    // Keep the original pool/index so excluding a name does not reshuffle others.
    if (excludeOmochi && /^おもち[0-9]*$/u.test(comparisonName(name))) continue;
    if (!taken.has(name)) return name;
  }
  // Impossible for the validated 128-bird world: do not introduce numeric fallback.
  // Continue with readable combinations after a long family history exhausts the pool.
  for(let size=2;size<=3;size++){
    const count=pool.length**size,start=hash(`${world.epoch}:${birdId}:${size}`)%count;
    for(let offset=0;offset<count;offset++){
      let index=(start+offset)%count,parts=[];for(let i=0;i<size;i++){parts.push(pool[index%pool.length]);index=Math.floor(index/pool.length);}
      const name=parts.join('・');if(name.length<=16&&!taken.has(name))return name;
    }
  }
  throw new RangeError('名前の候補を確認してください。');
}
/** Creation only. Do not use this policy to repair or rename any saved bird.
 * Numeric suffixes are not generated, but are excluded here defensively too.
 * Legacy chooser/suggestions retain their prior behavior and manual choice is free.
 */
export function newDefaultNameFields(world, birdId) {
  const name = chooseFromPool(world, birdId, DEFAULT_BIRD_NAMES, true);
  return {name, naming: automaticNaming(name)};
}
export function directLineNameFields(world, birdId) {
  const name = chooseFromPool(world, birdId, DIRECT_LINE_BIRD_NAMES);
  return {name, naming: automaticNaming(name)};
}
export function automaticNaming(name) {
  return {version: NAME_POLICY_VERSION, source: 'automatic', assignedName: name};
}
export function manualNaming(name) {
  return {version: NAME_POLICY_VERSION, source: 'manual', assignedName: name};
}
export function legacyNaming(name) {
  return {version: NAME_POLICY_VERSION, source: 'legacy', assignedName: name};
}
export function isValidNaming(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === 3
    && value.version === NAME_POLICY_VERSION
    && ['automatic', 'manual', 'legacy'].includes(value.source)
    && typeof value.assignedName === 'string' && value.assignedName.length > 0
    && value.assignedName.length <= 16 && (value.source === 'legacy' || value.assignedName === value.assignedName.trim())
    && !/[\u0000-\u001f\u007f]/u.test(value.assignedName);
}
export function defaultNameFields(world, birdId) {
  const name = chooseDefaultBirdName(world, birdId);
  return {name, naming: automaticNaming(name)};
}
/** Immutable additive migration; old unmarked names can NEVER prove automatic origin.
 * Explicit new-format automatic metadata only is authority for replacing old numeric defaults.
 * A mismatch between name and assignedName is preserved and demoted to legacy, not overwritten.
 * Do not infer provenance from hatch events, regex, name, ID or absence of rename events.
 */
export function migrateBirdNames(world) {
  const migrated = structuredClone(world);
  for (const b of migrated.birds) {
    if (!isValidNaming(b.naming) || b.naming.assignedName !== b.name) b.naming = legacyNaming(b.name);
    if (b.naming.source === 'automatic' && /[0-9０-９]/u.test(b.name)) {
      Object.assign(b, defaultNameFields(migrated, b.id));
    }
  }
  return migrated;
}

const LEGACY_PREFIXES = Object.freeze(['こはく','すず','わかば','こむぎ','つむぎ','そら','ふたば','ひなた','あんず','しずく','なずな','くるみ']);
/** Suggestions, NOT proof. Never apply these without individual user confirmation.
 * A matching ID suffix can equally be a manually chosen name in old saves.
 * Snapshot oldName is a required optimistic-concurrency guard for any future apply UI.
 */
export function suggestLegacyNumberedNames(world) {
  const preview = structuredClone(world), suggestions = [];
  for (const b of preview.birds) {
    if (isValidNaming(b.naming) && b.naming.source !== 'legacy') continue;
    if (!/^b[1-9]\d*$/u.test(b.id) || !LEGACY_PREFIXES.some(prefix => b.name === `${prefix}${b.id.slice(1)}`)) continue;
    const oldName = b.name, newSuggestion = chooseDefaultBirdName(preview, b.id);
    suggestions.push({birdId: b.id, oldName, newSuggestion, requiresConfirmation: true});
    b.name = newSuggestion; // Only the cloned preview reserves proposed names.
  }
  return suggestions;
}
