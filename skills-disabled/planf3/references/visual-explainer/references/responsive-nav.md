# Responsive Section Navigation

Use this pattern for a page with four or more major sections. It keeps the desktop TOC compact enough to preserve the reading surface and turns it into a horizontal scroller before the two-column layout becomes crowded.

## Structure

```html
<a class="skip-link" href="#plan-content">Skip to plan content</a>
<div class="wrap">
  <nav class="toc" aria-label="Plan sections">
    <a href="#purpose">Purpose</a>
    <a href="#problem">Problem</a>
  </nav>
  <main id="plan-content" class="main" tabindex="-1">
    <section id="purpose">...</section>
    <section id="problem">...</section>
  </main>
</div>
```

Rules:

- Keep the TOC first inside `.wrap`; CSS must not create a different visual and focus order.
- Keep link labels short and point them at real section IDs.
- Include one visible-on-focus skip link to `main#plan-content`.
- Use native anchors. The runtime may add `aria-current="location"`, but navigation works without JavaScript.
- Skip the TOC entirely only for pages with fewer than four major sections.

## Desktop

```css
:root {
  --page-gutter: clamp(.75rem, 2vw, 1.5rem);
  --page-toolbar: 2.75rem;
}

.wrap {
  width: min(calc(100% - 1.5rem), 120rem);
  margin-inline: auto;
  display: grid;
  grid-template-columns: fit-content(11rem) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.main { min-width: 0; }

.toc {
  position: sticky;
  inset-block-start: calc(var(--page-toolbar) + .5rem);
  max-block-size: calc(100dvh - var(--page-toolbar) - 1rem);
  overflow: auto;
  padding: .5rem 0;
  font-size: .8125rem;
  line-height: 1.35;
}

.toc a {
  display: block;
  min-block-size: 1.75rem;
  padding: .25rem .5rem;
  border-inline-start: 2px solid transparent;
  text-decoration: none;
  color: var(--text-dim);
}

.toc a:hover,
.toc a[aria-current] {
  color: var(--text);
  background: var(--surface2);
}

.toc a[aria-current] { border-inline-start-color: var(--accent); }
```

`fit-content(11rem)` lets short labels determine the sidebar width while capping unexpectedly long labels. Do not restore a fixed `15rem` column or inherited body-size links.

## Narrow and zoomed layouts

```css
@media (max-width: 64rem) {
  .wrap { width: 100%; display: block; }

  .toc {
    position: sticky;
    inset-block-start: var(--page-toolbar);
    z-index: 10;
    display: flex;
    overflow-x: auto;
    max-block-size: none;
    padding: .3rem var(--page-gutter);
    background: var(--bg);
    border-block-end: 1px solid var(--border);
  }

  .toc a {
    flex: none;
    white-space: nowrap;
    border-inline-start: 0;
    border-block-end: 2px solid transparent;
  }

  .toc a[aria-current] { border-block-end-color: var(--accent); }
}
```

Use a breakpoint based on content pressure rather than device identity. The canonical `64rem` switch prevents a narrow main column before typical tablet widths and high browser zoom. The horizontal TOC may scroll; the page itself may not.

## Scroll position and focus

- Reserve the compact toolbar with `html { scroll-padding-block-start: ... }`.
- Give target sections matching `scroll-margin-block-start`.
- Preserve a visible high-contrast focus indicator.
- Sticky chrome must not cover the focused link or target heading.
- The embedded runtime owns scroll-spy state and active-link centering. Do not add a second observer.
