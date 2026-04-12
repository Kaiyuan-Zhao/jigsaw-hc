# CSS Style System

## Layer Order

1. `tokens.css` - design tokens (`--c-*`)
2. `primitives.css` - shared typography presets
3. `components.css` - reusable interactive component patterns
4. `utilities.css` - single-purpose layout helpers
5. `style.css` - feature-level styling
6. `docs.css` - docs route-specific styling

## Naming Standard

- Prefix all classes with `c-`
- Prefix all CSS custom properties with `--c-`
- Keep transient UI state classes unprefixed: `is-open`, `is-liked`, `is-error`, `is-success`, `is-pending`, `is-unlocked`
- Keep behavior hooks in `data-ui-hook="..."`

## Migration Contract

- Global class rename: `j-*` -> `c-*`
- Global token rename: `--j-*` -> `--c-*`
- This is a complete namespace migration across frontend TS/CSS sources.

## Behavior-Coupled Selectors

- FAQ accordion
  - item: `data-ui-hook="faq-item"`
  - trigger: `data-ui-hook="faq-button"`
- Arcade assembly animation
  - section: `data-ui-hook="arcade-stage-section"`
  - pieces: `data-ui-hook="arcade-scroll-piece"`
  - subtitle hint: `data-ui-hook="arcade-stage-hint"`
- Piece balance pill
  - hook: `data-ui-hook="piece-pill"`

JS selectors should prefer `data-ui-hook` first and include class fallback only where compatibility is needed.

## Reuse Checklist For New UI

- Use token values before introducing raw color/spacing values.
- Reuse existing primitives/components before adding one-off selectors.
- If JS needs DOM targeting, add `data-ui-hook` and avoid style classes as hard dependencies.
- Keep route-specific styles in feature modules rather than growing shared layers.
