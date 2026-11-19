# Gacha introduction layout

## Reproduction and scope

At base `595969a1e555bb097c050b4ef010af3e33e0c55c`, the introduction's flex row squeezed the numbered guide between the leading sentence and the non-shrinking wallet. A 375px Chrome reproduction measured each instruction at 52.92px wide, reproducing the supplied screenshot's tall, heavily wrapped column and displaced machine image.

Only `src/game.css` changes runtime behavior. No prices, odds, draw logic, RNG, currency, persistence or save schema change. The guide uses its own full-width rows. At heights up to 600px, the balance and purchase controls come first; the complete guide remains scrollable directly after the draw controls and before the room preview. The compact draw button retains its price and a 48px minimum target. No instructions are removed.

## Verification

- New touch/mobile viewport regression: 320/375/402px widths; heights 420/568/600/667/844px. Readable guide, contained wallet, reachable machine image, 44px machine targets, full draw button on short screens, scroll to the guide, repeated panel opening/closing, and byte-equivalent stored world before/after browsing.
- Existing machine suite retained: all three prices/refunds, choice persistence, one charge per draw, static machine, reduced motion, result close/preview/focus, inventory and save checks. Its stale refund wording assertion was updated to the existing current wording while preserving the exact machine refund amount.
- Existing touch shelf-end regression retained. On supported mobile devices, landscape cases now assert the current orientation notice and return to portrait before interacting; rotation/resume must preserve the exact stored world. Unsupported desktop contexts retain their landscape layout checks. The former test tried to tap through the mandatory notice and timed out.
- Existing shared-home preview suite retained, including short-screen result controls and equip persistence.
- All Node, syntax/content, build and scoped Chrome/WebKit checks are required. Counts and CI result are recorded in the PR.
- Complete output comparison against the sealed base also checked all 654 files: 119 changed files, with only `src/game.css` changing substantively; the rest differ only in cache-version query strings.
- Protected output audit is in `gacha-intro-output-audit.json`: the only substantive protected output change is `src/game.css`; other changed protected bytes are verified cache-version propagation against the previously sealed base build. No arbitrary baseline regeneration.

Real iPhone/Safari testing and user-device visual inspection are not performed. Automated WebKit is not an iOS 15 device test. Release follows the required CI and review gates. Real-device confirmation remains separate from these automated checks.
