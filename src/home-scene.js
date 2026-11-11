/** One home backdrop for the living scene and the unsaved decoration preview.
 * Furniture is rendered from the caller's view; no world state is mutated. */
export function renderHomeScene({base,furniture}) {
 return `<picture class="game-habitat" data-home-background="field-home"><source media="(max-width: 600px)" srcset="${base}field-home-tall.webp"><img src="${base}field-home-wide.webp" alt="" aria-hidden="true" width="1600" height="1000" decoding="async"></picture>${furniture}`;
}
