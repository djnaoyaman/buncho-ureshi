# Educational bird photo cutout

The former `visuals.js` educational bird illustration is now the same left-facing photographic view everywhere (body map, quiz diagrams/results and article fallback). Game sprites, brand artwork, pet photographs, saved state and the original documentary photograph are unchanged.

- Photograph: DickDaniels, Java Finch (Padda oryzivora) RWD.jpg.
- Original: https://commons.wikimedia.org/wiki/File:Java_Finch_(Padda_oryzivora)_RWD.jpg
- License: https://creativecommons.org/licenses/by-sa/3.0/
- Source/licensing checked on 2026-11-03. Original source identifies the bird as Java Finch / Java Sparrow, photographed on Kauai, Hawaii.
- Existing local source: `public/photos/photo-23.webp`, SHA-256 `4a37db8c1165d93e48f7d99ff4ae99e2ebb57ba0e4abd10301fba53774ed1566`.
- Adaptation: a hand-traced SVG clipping contour, horizontal reflection and proportional display scaling. No generated anatomy, painted feathers, recoloring, retouching or reconstruction of hidden areas. The source pixels remain unchanged. The clipping adaptation is also offered under CC BY-SA 3.0.
- The same view is reused; it does not claim to depict different color varieties, juveniles, eggs or Omochi. Body-part detail panels retain their existing original close-up photographs and source links. The ear remains explicitly hidden by feathers.
- Body labels are ordinary buttons beneath the photo at every viewport, rather than pretending their old illustration coordinates mark exact positions on a different bird photograph.

Visual verification: source photograph inspected; resulting SVG rendered with Inkscape and visually checked. Full local browser launch was unavailable because the environment disallowed Chromium's socket; escalation hit a read-only bwrap mount error. Browser CI must still verify layout and interactions on the final branch.
