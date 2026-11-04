# Cage furnishing placement

This is illustrative game furniture, not a real bird-keeping prescription. The existing 216 collectible IDs, artwork forms, prices, finishes, save version and equipped slots are unchanged.

- Perch: attached high on the cage's upper crossbar.
- Swing and toys: suspended from the roof. When the full-window crop hides the roof, a suspension cord reaches toward it rather than letting the toy disappear.
- Food, water, greens and shellgrit: held in visible wall brackets at separate heights on the left/right of the central flight area. No form silently falls back to a floor position.
- Bath and liner: remain on the bottom tray.
- Scene fixtures are render-only. Product previews retain their original collectible artwork, while the cage preview, player home and friend homes all use the same placement rules.
- Side fixtures stay inside the visible part of a cropped cage. Wide, shallow windows use a smaller, vertically ordered arrangement within the visible cage; shellgrit remains above the bath. They remain noninteractive and behind bird controls.

## References checked 2026-11-04

- RSPCA, Housing and environments for pet birds: natural wooden perches, varied angles, swings and enough uncluttered space. https://www.rspca.org.uk/adviceandwelfare/pets/birds/environment
- RSPCA Australia, What kind of enclosure does my bird need?: paper floor liners, room for movement, and keeping food/water clear of droppings from perches. https://kb.rspca.org.au/categories/companion-animals/other-pets/birds/what-kind-of-enclosure-does-my-bird-need
- University of Queensland VETS, Care for your bird: sufficient perch height and avoiding contaminated food/water. https://uqvets.com.au/small-animal-hospital/animal-care-and-advice/care-your-bird

The stylized background and simulation do not enforce a veterinary cage layout or model droppings falling onto every object. Care information in the encyclopedia remains the reference for real husbandry.

## Verification

`tests/cage-placement.test.js` checks all 216 items' mounting categories, original art identity, and unchanged save round-trips. `tests/browser/cage-placement.spec.js` checks physical positions and screen bounds on 320×568, 390×844, 320×844, 768×1024, 1280×800, 1280×600, 1280×500, 1440×500, 1920×600 and 844×390 in Chrome and WebKit, plus friend rooms and preview/cancel/equip/reload. Screenshots are retained in the normal workflow artifact.
