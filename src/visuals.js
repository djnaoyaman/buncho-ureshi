export const SITE_NAME = "文鳥♬文鳥♬文鳥って嬉しいな♪";
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Documentary photo: DickDaniels, CC BY-SA 3.0. The original WebP is unchanged.
// The vector contour is a CC BY-SA 3.0 adaptation, traced from photo-23 pixels.
// One left-facing view is shared by every former educational bird illustration.
let birdPhotoSequence = 0;
export const BIRD_PHOTO_SOURCE = "https://commons.wikimedia.org/wiki/File:Java_Finch_(Padda_oryzivora)_RWD.jpg";
export function birdPhotoCredit() {
  return '<span class="bird-photo-credit">写真：<a href="' + BIRD_PHOTO_SOURCE + '" target="_blank" rel="noopener noreferrer">DickDaniels / 元の写真</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>。背景の切り抜き・左右反転・縮小表示。同じライセンスで提供。一般の文鳥で、おもち本人ではありません。</span>';
}
export function birdSvg() {
  const id = 'bird-photo-clip-' + (++birdPhotoSequence);
  return `<svg class="bird-photo-cutout" viewBox="185 75 620 640" role="img" aria-label="左向きにそろえた灰色の文鳥の切り抜き写真" xmlns="http://www.w3.org/2000/svg"><title>文鳥の全身写真</title><desc>撮影：DickDaniels。CC BY-SA 3.0。背景を輪郭で切り抜き、左右反転。羽色・体の形は原写真のまま。おもち本人ではありません。</desc><defs><clipPath id="${id}"><path d="M 576 157 C 585 121 622 107 652 112 C 679 112 704 128 714 157 L 720 166 Q 742 187 765 234 Q 742 241 713 236 Q 708 257 701 274 C 705 319 675 380 642 413 Q 628 441 618 455 L 655 447 Q 669 442 669 451 L 660 461 Q 678 476 687 501 L 690 511 Q 682 511 678 505 L 666 490 L 661 499 Q 656 506 651 501 L 654 482 L 643 480 L 613 484 Q 595 489 580 509 L 570 526 Q 565 524 572 506 L 585 483 L 575 488 Q 570 486 580 475 L 591 463 Q 533 509 462 530 L 444 541 Q 476 563 533 585 Q 558 582 580 584 L 598 592 Q 607 600 599 603 L 577 596 L 550 601 L 575 612 Q 597 624 605 649 Q 611 663 603 666 L 594 646 L 584 631 L 583 641 Q 579 652 569 652 L 566 647 Q 580 640 574 630 L 554 619 L 548 622 Q 541 630 531 629 Q 527 623 537 617 L 526 608 L 512 616 Q 503 626 503 636 Q 496 635 498 622 L 516 595 Q 474 572 432 551 L 424 540 Q 357 557 294 614 L 237 677 L 226 686 Q 252 635 275 589 Q 291 555 312 523 Q 336 462 363 405 C 391 337 426 282 455 251 Q 510 197 576 157 Z"/></clipPath></defs><g transform="translate(990 0) scale(-1 1)"><image href="photos/photo-23.webp" width="1066" height="800" clip-path="url(#${id})"/></g></svg>`;
}
export function flourish(kind = "horizontal") {
  return `<svg class="flourish ${kind}" viewBox="0 0 500 80" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 63C84 81 101 0 172 26S228 69 250 45C272 69 309 0 363 28S420 79 496 63"/><path d="M90 57q-5-35 28-36-3 29-28 36m55-27q1-22 24-25-1 20-24 25m266 28q5-35-28-36 3 29 28 36m-55-27q-1-22-24-25 1 20 24 25"/><path d="M235 36q15-27 30 0-15 24-30 0Z"/></g></svg>`;
}
// Kept as an API name for existing callers; the approved logo is raster artwork, not SVG.
export const BRAND_ASSET = 'brand/wordmark-04-transparent.webp';
export const BRAND_SIZE = Object.freeze({ width: 1120, height: 645 });
export function logoSvg(className = "") {
  return `<img class="brand-art ${esc(className)}" src="${BRAND_ASSET}" width="${BRAND_SIZE.width}" height="${BRAND_SIZE.height}" alt="${SITE_NAME}" decoding="async" fetchpriority="high">`;
}
export function habitatSvg() {
  return `<svg viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true"><path d="M0 400Q150 310 310 370T680 365 1000 385V440H0Z" fill="#dfe6ca"/><g fill="none" stroke="#78906b" stroke-width="8" stroke-linecap="round"><path d="M15 410C45 220 148 315 225 130S430 205 480 95"/><path d="M995 430C940 150 825 330 752 148S650 150 608 88"/></g><g fill="#aac098"><ellipse cx="130" cy="260" rx="38" ry="13" transform="rotate(-40 130 260)"/><ellipse cx="220" cy="170" rx="33" ry="13" transform="rotate(-20 220 170)"/><ellipse cx="335" cy="130" rx="32" ry="13" transform="rotate(25 335 130)"/><ellipse cx="885" cy="280" rx="38" ry="13" transform="rotate(40 885 280)"/></g><ellipse cx="500" cy="395" rx="108" ry="24" fill="#b5d5d2" stroke="#95ada5" stroke-width="4"/><path d="M710 376q60-48 115 0-55 45-115 0" fill="#d4b984"/><g fill="#d9b4a2"><circle cx="87" cy="357" r="13"/><circle cx="914" cy="355" r="16"/></g></svg>`;
}
