# Game Home Screen launch target

## Report and cause

Adding the game to the Home Screen opened the site top. At main `c3da2021d2ccb99dbaf1a36511cf6471003714a6`, every static route and client-side route used `manifest.webmanifest` with `start_url: "./"`. From the manifest URL, that resolves to `/buncho-ureshi/`, including when the visible page is `/buncho-ureshi/game/`.

## Correction

- Preserve the original site manifest, site identity, icons and top-page launch URL unchanged.
- Game documents use `game.webmanifest`, with `id: "/buncho-ureshi/game/"`, `start_url: "./game/"` and the short label `文鳥ぐらし`.
- Keep scope at `./` so help and other pages remain accessible within the same web app.
- Generate the correct manifest link and application/Apple title in the static HTML, before JavaScript.
- Use a normal document navigation when entering or leaving the game. Other site navigation remains client-side. This avoids Safari retaining a site manifest that was already loaded during an earlier, cancelled Home Screen add operation. Back/Forward can restore the appropriate document; a mismatched same-document history entry reloads.
- Query and fragment values are not part of the game launch URL or identity. Game-path search parameters retain the game installation identity.
- Do not migrate, clear or rewrite game saves. Access help tells users to export their game JSON before adding/replacing icons because browser and Home Screen storage can differ.

## Evidence and limits

- Source reproduction: static game HTML referenced the unchanged site-top manifest before this fix.
- Build and syntax/content checks pass locally. Regression tests inspect all 53 static pages plus 404, both manifests, icon files, scope and identity resolution. Existing application and SEO tests are included.
- Browser regression tests cover static no-JavaScript game/site documents; fetching icons; opening each resolved launch URL; top → game → Back → Forward → reload; game → help → game; repeated exit and re-entry; and unchanged local storage.
- Chromium tests prime `Page.getAppManifest` on the site top before navigating and check the browser's game manifest afterward, in addition to checking DOM metadata. WebKit tests verify routing and document metadata, not the native iOS install sheet.
- Local Chromium launch is blocked by this executor's socket restriction. The repository's normal verify workflow runs the new browser tests in Chrome and WebKit before publication. See the PR's exact-head CI result for those outcomes.
- No physical iPhone/iPad is available here. Actual Safari share-sheet addition, icon launch and storage transfer are **not device-verified**. Existing installed icons may retain their old target and should not be deleted before saved-game backup and restoration are confirmed.

## Platform references

- [Apple: What’s new in web apps](https://developer.apple.com/videos/play/wwdc2023/10120/) describes `start_url`, scope and separate Home Screen storage.
- [Web App Manifest specification](https://www.w3.org/TR/appmanifest/#id-member) resolves the application ID against the start URL's origin.
- [WebKit DocumentLoader](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/loader/DocumentLoader.cpp) retains an already-created application manifest loader for the document.
