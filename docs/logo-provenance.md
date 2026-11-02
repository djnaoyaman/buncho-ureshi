
## 2026-11-02 — true alpha correction

The previous multiply/brightness presentation was insufficient: a paper-colored rectangle remained visible on the owner's screen. It is superseded by `brand/wordmark-04-transparent.webp`, a lossless alpha-only derivative of the unchanged original wordmark. The original decoded RGB values remain byte-exact at every pixel; only opacity changes. The enclosed white bird body remains opaque. The approved master, original opaque wordmark, icons and OGP assets remain untouched. UI blend/filter effects are removed. The transparent derivative uses a new URL to avoid an old opaque asset cache. Header/hero proportions remain those of the preceding release.

The regression test now decodes the served alpha, checks transparent borders and a transparent majority, verifies an opaque white bird sample, and compares opaque RGB against the original. Composed mobile/desktop screenshots and a contrasting-background case complement these data checks. CI/live and independent visual inspection remain required before declaring completion.
