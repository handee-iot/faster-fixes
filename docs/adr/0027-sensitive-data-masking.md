# ADR-0027: Sensitive data is masked in the capture clone

- **Status**: Accepted
- **Date**: 2026-11-20

## Context

A screenshot can contain anything the page shows: account numbers, addresses,
customer records, card digits, API tokens rendered in a debug panel. Marker.io
solves this with CSS classes (`.mk-exclude`, `.mk-mask`, `.mk-unmask`) applied
client-side before the capture is rendered, so the original content never
reaches its servers.

The widget captures with `modern-screenshot`, which clones `document.body`,
inlines the computed styles, materialises `::before`/`::after` content and then
rasterises the clone. The clone pass is the right place to mask: the live page
is never modified, no flicker reaches the user, and the only bytes uploaded are
the already-masked image.

## Decision

- Three opt-in rules, plus attribute forms for markup that cannot add classes:
  - `.ff-exclude` / `data-ff-exclude`: the element and its subtree are replaced
    by a neutral hatched block sized to the element's measured box. Strongest
    rule; nothing inside is rendered.
  - `.ff-mask` / `data-ff-mask`: every non-whitespace character in the
    element's text (including descendants) is replaced by a bullet, preserving
    length, spaces and line breaks. Input values, placeholders and image `alt`
    text inside the region are cleared. Pseudo-element content (`::before` /
    `::after`) is hidden with a capture-time stylesheet, because the renderer
    materialises it after the clone hook. Text only: images, canvas and
    backgrounds need `.ff-exclude`.
  - `.ff-unmask` / `data-ff-unmask`: restores a descendant inside a masked
    region. Ignored inside an excluded region, and ignored inside an
    automatically masked secret field.
- Password inputs, `autocomplete` values containing `password`, `cc-*` or
  `one-time-code` are masked without a class and cannot be unmasked.
- Masking runs in `maskSensitiveData`, called from the screenshot's
  `onCloneNode` hook. `prepareCaptureMasking` tags excluded elements with a
  run-specific attribute and records their boxes so the placeholder keeps the
  original size even when its height comes from children; the attribute is
  removed when the capture settles.
- No `.mk-*` aliases. The namespace is ours and we do not promise Marker's
  exact semantics. Teams migrating from Marker change three class names.
- No blur. Blurred short strings can be recovered; replace or exclude.

## Alternatives considered

- **Mutate the live DOM before capture and restore it afterwards**: visible
  flicker, a race with the app's own styles, and a risk of leaving the mask
  behind. The clone is isolated and disposable.
- **Blur or pixelate**: reversible for short text and still transmits the
  original pixels.
- **Server-side redaction or OCR**: puts the sensitive image on the server, the
  opposite of the goal, and cannot know the site's intent.
- **A widget-level setting that masks all inputs**: useful as a strict mode,
  but it surprises reviewers and hides context that is usually safe (a search
  query, a selected filter). The automatic secret fields cover the real risk;
  per-element classes cover the rest.

## Consequences

- The site owner's markup is the contract. A missing class leaks what it wraps;
  the docs call this out and show the common cases. Pseudo-element content in a
  masked region (including decorative icons) disappears while the capture is
  being made; `ff-unmask` restores text, not pseudo content.
- The widget IIFE grows by ~2.2KB (ceiling raised to 115,000 in its own
  commit).
- Images, canvas, video and CSS background images are not text; they are only
  safe with `.ff-exclude`. Shadow DOM and cross-origin iframes are outside the
  clone's reach.
- The Diagnostics Trail (console and network) is not affected by these classes.
  Scrubbing it is a separate ticket.
- Session replay is not implemented; if it is added as a DOM replay, the same
  class contract maps to rrweb's `blockClass` / `maskTextClass` options.
- Unit tests cover the clone pass; a live capture check confirms the
  integration with `modern-screenshot`.
