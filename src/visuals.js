export const SITE_NAME = "文鳥♬文鳥♬文鳥って嬉しいな♪";
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function birdSvg(color = "white", stage = "adult") {
  const grey = !["white", "白", "白文鳥"].includes(color),
    chick = ["chick", "ひな", "juvenile", "幼鳥"].includes(stage),
    egg = ["egg", "卵"].includes(stage);
  if (egg)
    return '<svg viewBox="0 0 140 130" role="img" aria-label="文鳥の卵のイラスト"><ellipse cx="70" cy="75" rx="27" ry="37" fill="#f5eddb" stroke="#756c53" stroke-width="2"/></svg>';
  return `<svg viewBox="0 0 180 150" role="img" aria-label="${grey ? "桜" : "白"}文鳥の${chick ? "幼い姿の" : ""}イラスト"><path d="M99 108l46 11-25-29" fill="${grey ? "#404c4e" : "#d8dfd7"}" stroke="#52645a" stroke-width="1.5"/><ellipse cx="80" cy="86" rx="48" ry="40" fill="${grey ? "#9a9fa2" : "#fffdf4"}" stroke="#52645a" stroke-width="1.5"/><path d="M71 74q50 8 32 38-31-6-32-38Z" fill="${grey ? "#7d8589" : "#e9eee6"}" stroke="#849485"/><circle cx="57" cy="53" r="32" fill="${chick ? "#a9a49a" : grey ? "#303e40" : "#fffdf4"}" stroke="#52645a" stroke-width="1.5"/>${grey && !chick ? '<path d="M36 56q0 25 25 22l10-17Z" fill="#f9f8ee"/>' : ""}<path d="M30 45 8 54 31 67Z" fill="${chick ? "#70665f" : "#d76662"}" stroke="#b64f4c"/><circle cx="45" cy="48" r="6" fill="none" stroke="${chick ? "#8d7666" : "#d98d83"}" stroke-width="3"/><circle cx="45" cy="48" r="3.6" fill="#203d35"/><circle cx="44" cy="47" r="1" fill="white"/><path d="m70 120-2 14m22-13 3 12m-28 0 13 1m13-1 14-2" fill="none" stroke="#ce9688" stroke-width="3" stroke-linecap="round"/></svg>`;
}
export function flourish(kind = "horizontal") {
  return `<svg class="flourish ${kind}" viewBox="0 0 500 80" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 63C84 81 101 0 172 26S228 69 250 45C272 69 309 0 363 28S420 79 496 63"/><path d="M90 57q-5-35 28-36-3 29-28 36m55-27q1-22 24-25-1 20-24 25m266 28q5-35-28-36 3 29 28 36m-55-27q-1-22-24-25 1 20 24 25"/><path d="M235 36q15-27 30 0-15 24-30 0Z"/></g></svg>`;
}
export function logoSvg(className = "") {
  return `<svg class="brand-art ${className}" viewBox="0 0 760 280" role="img" aria-label="${SITE_NAME}"><g fill="none" stroke="#6a8066" stroke-width="2"><path d="M35 213C138 245 141 145 248 169S387 233 491 169 629 151 725 213"/><path d="M57 201C50 138 94 136 99 171m564 10c24-57 59-15 45 10M126 202q-16-30 12-47 15 29-12 47M610 175q-5-35 27-38 7 30-27 38"/><path d="M97 78C151 3 256 30 271 57m210 0C549 9 619 22 668 76" stroke="#b3955b"/></g><g fill="#244c3b" font-family="Yu Mincho,Hiragino Mincho ProN,serif" text-anchor="middle"><text class="logo-word w1" x="210" y="104" font-size="73">文鳥</text><text class="logo-word w2" x="446" y="103" font-size="73">文鳥</text><text class="logo-word w3" x="380" y="173" font-size="44" letter-spacing="4">文鳥って嬉しいな</text></g><g fill="#b8766c"><path d="M318 53v47c-17-9-30 14-9 14 8 0 14-7 14-13V66l22-5v31c-18-7-27 13-10 14 8 1 15-5 15-12V46Z"/><path d="M556 53v47c-17-9-30 14-9 14 8 0 14-7 14-13V66l22-5v31c-18-7-27 13-10 14 8 1 15-5 15-12V46Z"/><path d="M681 131v36c-17-8-28 13-10 15 9 0 15-7 15-14v-26q17 4 15 18 13-22-20-29Z"/></g><g transform="translate(306,184) scale(.68)">${birdSvg().replace(/<svg[^>]*>|<\/svg>/g, "")}</g><circle cx="73" cy="172" r="6" fill="#d69e92"/><circle cx="687" cy="181" r="7" fill="#d69e92"/></svg>`;
}
export function habitatSvg() {
  return `<svg viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true"><path d="M0 400Q150 310 310 370T680 365 1000 385V440H0Z" fill="#dfe6ca"/><g fill="none" stroke="#78906b" stroke-width="8" stroke-linecap="round"><path d="M15 410C45 220 148 315 225 130S430 205 480 95"/><path d="M995 430C940 150 825 330 752 148S650 150 608 88"/></g><g fill="#aac098"><ellipse cx="130" cy="260" rx="38" ry="13" transform="rotate(-40 130 260)"/><ellipse cx="220" cy="170" rx="33" ry="13" transform="rotate(-20 220 170)"/><ellipse cx="335" cy="130" rx="32" ry="13" transform="rotate(25 335 130)"/><ellipse cx="885" cy="280" rx="38" ry="13" transform="rotate(40 885 280)"/></g><ellipse cx="500" cy="395" rx="108" ry="24" fill="#b5d5d2" stroke="#95ada5" stroke-width="4"/><path d="M710 376q60-48 115 0-55 45-115 0" fill="#d4b984"/><g fill="#d9b4a2"><circle cx="87" cy="357" r="13"/><circle cx="914" cy="355" r="16"/></g></svg>`;
}
