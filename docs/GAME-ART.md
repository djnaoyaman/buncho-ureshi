# Game artwork provenance and visual contract

The bird sprites and woodland habitat are original generated game imagery produced with the built-in image generation tool on 2026-11-02. They are not documentary photographs, an actual observation of Omochi, or images for the factual photo encyclopedia. No paid API or API key was used. The private appearance reference, original photograph, hand/background, metadata and private filename are excluded from this repository and build. No Creative Commons license is invented for generated assets. Licensed documentary photographs remain separately attributed in the encyclopedia.

The white adult appearance was informed by a supplied white Java sparrow reference. Additional adult and juvenile colors are representative fictional game depictions, not exact genetic standards. The chick is a representative older downy nestling, not a literal newly hatched naked chick. Game ages and growth are simplified. The egg is an original native SVG with a smooth gradient.

## Rendering

The initial 11 WebP assets total 2,459,096 bytes and are retained below as provenance for the earlier release; current adult/juvenile rendering uses the pose atlases described next. Assets are shared by URL; ten birds of the same color do not request ten copies. WebP conversion removes metadata, preserves native dimensions and alpha, and does not recolor or crop image content. Wide habitat is 16:10 at a maximum 960 × 600 CSS pixels; narrow habitat is 3:4 at a maximum 375 × 500. Sprite canvas normalization preserves intrinsic image ratios and aligns actual feet with reviewed branch, root, feeding and bath anchors. The nest contains eggs and chicks. All residents remain in the accessible outside picker; only the selected caption is inside the scene. Short near hops or distant dissolves avoid pretending a closed-wing image is a flying animation. Reduced motion, pause and motion-off settings disable these effects.

## Natural pose release

The current adult and juvenile birds use **56 generated poses in eight shared WebP atlases**, totaling **2,520,698 bytes**. Four adult colors each have left, right, back, preen, peck, tilt, stretch and rest frames. Four juvenile colors each have left, right, back, preen, peck and rest frames; their beaks remain dark rather than using adult red-beak recoloring. These are generated game illustrations, **not actual photographs of Omochi** or factual encyclopedia photographs.

Native atlas dimensions and alpha are preserved. No pixel redraw, automatic background replacement or RGB/alpha threshold editing is performed by the renderer. Reviewed per-pose crop windows and CSS viewport polygons isolate adjacent frames, including diagonal neighboring tails. They do not change the underlying image pixels. `src/data/pose-atlases.js` contains those measured source-pixel crop bounds, absolute foot contacts, native dimensions and optional clip polygons. No equal-grid guess is used.

All adult frames share scale 2 within each atlas; all juvenile frames share scale 1.7. A horizontal tail or opened wing may extend outside the invisible 850 × 1000 contact/hit plane; its **visible clipped window must remain inside the habitat**. A frame is never enlarged to an arbitrary height or squeezed to fit. Only the formerly oversized single-bird feeding view uses a smaller fixed contact-plane width (21% narrow / 13.2% wide) for every pose, so a sideways juvenile tail clears the left room edge without moving its feet. Other singleton views and all multi-resident widths stay unchanged. True left and right source images are used; CSS mirroring does not substitute for different anatomy.

A presentation-only clock gives individual birds deterministic staggered quiet holds, occasional preening/back/rest positions and brief interior-anchor stretches. Eating selects peck/head-up frames; active social partners turn toward each other. Pose updates keep the existing decoded atlas image, resident buttons, form controls and drafts intact. They do not consume world RNG or change saved needs, relationships, memories, care state or timestamps. Paused, hidden, motion-off and reduced-motion states hold the presentation clock without offline catch-up. Responsive reframing may update direction to keep a partner-facing pose correct after a layout change. Leaving the game clears the pose timer and media/visibility listeners. These frames are discrete poses, not a claimed full skeletal flight animation.

`tests/bird-poses.test.js` checks all eight atlases, all 56 frame geometries, native foot contact, action/direction choices, asynchronous deterministic variety, quiet holds, stable DOM nodes and 6,000 room-bound pose placements. Registered browser tests check actual decoding, visible crop bounds, responsive screenshots, pose changes, saved-state immutability, pause and reduced motion. Registration and Node geometry checks are not a substitute for real-browser visual review; the release owner records exact-commit CI and live verification.

### Pose atlas file hashes

- `cinnamon-poses.webp` — 359826 bytes; SHA-256 `8f43bd78e3a3f0a921f62f4db5876e93a8da0604fe67c84d337ff1d85a83c326`.
- `juvenile-cinnamon-poses.webp` — 273836 bytes; SHA-256 `549061a533e26a22b88a81a943522c4980cb47694b19db30aacbb15b0f4efc0e`.
- `juvenile-sakura-poses.webp` — 289608 bytes; SHA-256 `32f1070eec3894b49ec575f87c8d6d9e9bbac57f47112a7baf4715684a4896bc`.
- `juvenile-silver-poses.webp` — 276926 bytes; SHA-256 `beabcf2a904c17e2133c81a39dee74b04ac4061bd4171141245b2220453a4a4c`.
- `juvenile-white-poses.webp` — 240466 bytes; SHA-256 `0710fe0a16f33627990e295a91377d738ba0c255f6da53acc5d2146ac6e453aa`.
- `sakura-poses.webp` — 322276 bytes; SHA-256 `f4e9930457178efd6e89bc9d71100f955516a4778e9bd7c1a546499d034877e2`.
- `silver-poses.webp` — 313622 bytes; SHA-256 `bcdfc77cb81504be1914b76bf9a7533e2d19187bb5b5db5dd56839edf50a0210`.
- `white-poses.webp` — 444138 bytes; SHA-256 `8e6c308ddeed1f6a2675b7f884fb01dddf99c3d85cee0e052ecc335fdbb4dec0`.

## Initial generated asset manifest (retained provenance)

```json
[
  {
    "name": "white",
    "width": 1157,
    "height": 1359,
    "bytes": 160540,
    "sha256": "6b5c23da1d778355e6cffc6325973661b0c33f3a2fea351a56bcc0ccfed8e8ed"
  },
  {
    "name": "sakura",
    "width": 1157,
    "height": 1359,
    "bytes": 203200,
    "sha256": "d5035f9cef6551c0e69b806f40eab650417716222dba1c2613641fdc7528fa5c"
  },
  {
    "name": "cinnamon",
    "width": 1157,
    "height": 1359,
    "bytes": 183434,
    "sha256": "7f57e3eb5b5d1a43d26c4f876c221c58c4a7b90b2e35f2df55d4665649aac459"
  },
  {
    "name": "silver",
    "width": 1157,
    "height": 1359,
    "bytes": 173622,
    "sha256": "3521c7f02783658bdd096a39dcdfb950d1b04bd4194957741ac39838a9eabc13"
  },
  {
    "name": "juvenile",
    "width": 1312,
    "height": 1199,
    "bytes": 194996,
    "sha256": "25c49954519c3642687fafc12e48c543cfa5ae7cba430085289816954ff6c9ed"
  },
  {
    "name": "juvenile-white",
    "width": 1295,
    "height": 1214,
    "bytes": 145944,
    "sha256": "fc2fd2974f489718dad308d9833dca4d2890dc87601237a815811acf89d35bec"
  },
  {
    "name": "juvenile-cinnamon",
    "width": 1312,
    "height": 1199,
    "bytes": 148336,
    "sha256": "83167b6c45f1e0ff231817d0fdf407de553ba6e0c36f2364ad3109b95c01bfc6"
  },
  {
    "name": "juvenile-silver",
    "width": 1312,
    "height": 1199,
    "bytes": 151610,
    "sha256": "be43634f8e745f6bbcf65838e2026504775c3b22cf24242f7fda294d5414ea76"
  },
  {
    "name": "chick",
    "width": 1312,
    "height": 1199,
    "bytes": 295520,
    "sha256": "0294d453d0fed515c0ea6143e2e0abfc045bf75f0a34e3533b0f7a4f1d35da6f"
  },
  {
    "name": "habitat-wide",
    "width": 1586,
    "height": 992,
    "bytes": 409962,
    "sha256": "e0dad06a8f01890e6030a35b30a2147e7edc5b37ad168106d61e500be1c0837c"
  },
  {
    "name": "habitat-tall",
    "width": 1086,
    "height": 1448,
    "bytes": 391932,
    "sha256": "3c71c046f20b1135b65fb8028208ea0ce7ac77bfee36767ce6e55721de18d229"
  }
]
```

## Generation direction

Photo-quality isolated Java sparrows with believable conical bills, eyes, layered plumage, folded wings and pink feet; no text or private reference surroundings. Adult colors: white, normal/pied game category, cinnamon and silver. Juvenile variants keep appropriately darker young bills and restrained eye rims. The two coherent woodland backgrounds include natural wood perches at multiple depths, foliage, dappled light, a nest, a feeding bowl and a shallow stone bath. Generated scenes are fictional habitats, not husbandry guidance.

## Verification boundary

Pure geometry and DOM tests do not establish photographic quality. The final compressed assets, mixed-age desktop/mobile compositions and actual browser screenshots must each be inspected. Browser tests check decoding, intrinsic ratios, physical contact anchors, bounded scene size, selection of all residents and existing save/game/studio flows.

## Browser-driven corrections

The first new-habitat browser run caught a strict 44 px target minimum failure in the crowded 320 px scene. Mature targets now use a 46 px CSS/geometry safety margin; the browser still requires at least 44 px. The actual mixed-age mobile screenshot also exposed two not-yet-painted juvenile sprites after repeated DOM replacement, despite fetched-image dimensions being present. Small scene sprites now request synchronous decoding; screenshot gates explicitly decode every current scene image and wait for paint rather than using fetch completion as a proxy.

Active, same-start play/bath targets now reserve nearby pairs of existing physical anchors, with reciprocal encounters first. This changes only spatial depiction, not simulation state. Declined/talk actions, absent targets and nest-bound young are excluded. Crowded simultaneous bath pairs are not falsely promised a shared bath: nearby real surfaces are used without overlapping birds. The selected exchange cue is visible on narrow screens as well as desktop.
