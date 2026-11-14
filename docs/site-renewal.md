# 非ゲームサイト刷新

Owner approved mobile-first ivory / botanical editorial design (14 Nov 2026). 90% smartphone traffic. GAME stays above EXPLORE. The game and its saved world must not change.

## Three releases, one PR at a time
1. Isolated site layer, shared navigation and home.
2. Encyclopedia, color profiles, body and observation pages.
3. Challenge, studio, help, credits and complete responsive verification.

## Isolation contract
The legacy build and all original JS/CSS/assets are left untouched. `build-site-renewal.mjs` runs after that build and only transforms non-game HTML. It creates a new `site-app.js` entry with a new home renderer, without replacing the original `app.js` used by game. The dedicated stylesheet is never linked from game HTML. Site/game navigation continues to perform a document navigation.

`site/game-protected-baseline.json` seals 553 original output files from 435d36d (PR #199 startup fix): game HTML and ALL original non-HTML files, including shared runtime, game audio/art, manifests, icons, and analytics. Every build asserts identical hashes before and after editorial output. A changed protected file blocks build/publication; never blindly regenerate this baseline to pass. A separately authorized game change requires an intentional baseline update against that change and independent review.

## Artwork
Hero is generated illustration referencing the supplied sparrow photograph and approved direction. It is not a documentary photo of Omochi. The original photo remains on the observation page and existing editorial photos retain their attribution. Hero label/alt explicitly distinguish the illustration. Navigation feather and brush are original vector illustrations.

## Gates
All Node checks; focused Chrome/WebKit responsive widths 320–1440; menu, history/reload, game document boundary, original saved data retention. iPhone physical-device checks remain distinct from WebKit automation. Inspect screenshot evidence before merging. Non-game temporary inconsistency may be tolerated; game regression may not.
