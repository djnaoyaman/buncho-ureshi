// Presentation only. The controller owns eligibility, tokens, focus and actions.
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds = new Set(['adoption', 'independence', 'successor']);
export function renderConsultationLetter(vm) {
  if (!vm || !kinds.has(vm.kind)) throw new TypeError('A supported consultation kind is required.');
  for (const key of ['title', 'letter', 'signature', 'changes', 'remains', 'warning', 'acceptLabel', 'trustedBirdMarkup']) {
    if (typeof vm[key] !== 'string' || !vm[key].trim()) throw new TypeError(`Missing presentation field: ${key}`);
  }
  const e = escape, kind = vm.kind;
  // trustedBirdMarkup must come exclusively from the existing smallBird renderer.
  // Never pass user-authored HTML, a live DOM reference, or a callback here.
  const cancel = kind === 'adoption' ? '<button type="button" data-adoption-cancel autofocus>あとで決める</button>' : kind === 'independence' ? '<button type="button" data-independence-cancel autofocus>今は一緒に暮らす</button>' : '<button type="button" data-successor-cancel autofocus>今は選ばない</button>';
  const choices = kind === 'adoption' ? `<button type="button" data-adoption-decision="later">また遊ぼう</button><button type="button" data-adoption-decision="accept">${e(vm.acceptLabel)}</button>` : `<button type="button" data-${kind}-accept>${e(vm.acceptLabel)}</button>`;
  return `<section class="game-consultation-letter" data-consultation-kind="${kind}">
    <h2 id="game-${kind}-title">${e(vm.title)}</h2>
    <div class="game-consultation-paper">
      <div class="game-consultation-portrait" aria-hidden="true">${vm.trustedBirdMarkup}</div>
      <p class="game-consultation-message">${e(vm.letter)}</p>
      <p class="game-consultation-signature">${e(vm.signature)}</p>
    </div>
    <div class="game-consultation-outcomes"><h3>変わること</h3><p>${e(vm.changes)}</p><h3>そのまま残ること</h3><p>${e(vm.remains)}</p><p class="game-consultation-warning">${e(vm.warning)}</p></div>
    <div class="game-consultation-actions">${cancel}${choices}</div>
    <p data-${kind}-notice role="status"></p>
  </section>`;
}
