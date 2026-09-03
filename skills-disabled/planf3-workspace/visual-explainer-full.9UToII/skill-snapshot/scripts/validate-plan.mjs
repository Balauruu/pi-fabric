#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const META_KEYS = [
  'created',
  'modified',
  'commits',
  'agent',
  'session',
  'back-references',
  'forward-references',
];
const HOOKS = ['phase', 'task', 'check', 'validation'];
const PRESENTATION_SECTION_IDS = ['purpose', 'problem', 'solution', 'files', 'contracts', 'phases', 'risks', 'validation', 'amendments'];
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RESOURCE_ELEMENTS = new Set(['base', 'embed', 'iframe', 'img', 'link', 'object', 'script', 'source', 'track', 'video', 'audio']);
const BLOCK_ELEMENTS = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
const VALID_STATUSES = new Set(['[]', '[wip]', '[x]', '[f]']);

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function readTag(source, start) {
  let quote = '';
  for (let i = start + 1; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return { raw: source.slice(start + 1, i), end: i + 1 };
    }
  }
  return null;
}

function parseAttributes(raw) {
  const attributes = new Map();
  const nameMatch = raw.match(/^\s*[^\s/>]+/);
  const rest = raw.slice(nameMatch?.[0].length ?? 0);
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of rest.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function parseHtml(source) {
  const root = { name: '#root', attributes: new Map(), children: [], parent: null, start: 0, text: '' };
  const stack = [root];
  const comments = [];
  const errors = [];
  let hasDoctype = false;
  let index = 0;

  const addText = (text, start) => {
    if (text) stack.at(-1).children.push({ name: '#text', text, attributes: new Map(), children: [], parent: stack.at(-1), start });
  };

  while (index < source.length) {
    const open = source.indexOf('<', index);
    if (open === -1) {
      addText(source.slice(index), index);
      break;
    }
    addText(source.slice(index, open), index);

    if (source.startsWith('<!--', open)) {
      const close = source.indexOf('-->', open + 4);
      if (close === -1) {
        errors.push({ index: open, message: 'unclosed HTML comment' });
        break;
      }
      comments.push({ text: source.slice(open + 4, close), start: open });
      index = close + 3;
      continue;
    }

    if (/^<!doctype\b/i.test(source.slice(open))) {
      const tag = readTag(source, open);
      if (!tag) {
        errors.push({ index: open, message: 'unclosed doctype' });
        break;
      }
      hasDoctype = true;
      index = tag.end;
      continue;
    }

    if (source.startsWith('</', open)) {
      const tag = readTag(source, open);
      if (!tag) {
        errors.push({ index: open, message: 'unclosed closing tag' });
        break;
      }
      const name = tag.raw.slice(1).trim().split(/\s+/)[0].toLowerCase();
      const current = stack.at(-1);
      if (current.name !== name) {
        errors.push({ index: open, message: `closing </${name}> crosses open <${current.name}>` });
        const matching = stack.findLastIndex(node => node.name === name);
        if (matching > 0) stack.splice(matching);
      } else {
        current.end = tag.end;
        stack.pop();
      }
      index = tag.end;
      continue;
    }

    if (source.startsWith('<!', open) || source.startsWith('<?', open)) {
      const tag = readTag(source, open);
      if (!tag) {
        errors.push({ index: open, message: 'unclosed declaration' });
        break;
      }
      index = tag.end;
      continue;
    }

    const tag = readTag(source, open);
    if (!tag) {
      errors.push({ index: open, message: 'unclosed opening tag' });
      break;
    }
    const name = tag.raw.trim().split(/[\s/>]/)[0].toLowerCase();
    if (!name) {
      errors.push({ index: open, message: 'empty opening tag' });
      index = tag.end;
      continue;
    }
    const node = {
      name,
      attributes: parseAttributes(tag.raw),
      children: [],
      parent: stack.at(-1),
      start: open,
      end: tag.end,
      text: '',
    };
    stack.at(-1).children.push(node);
    const selfClosing = /\/\s*$/.test(tag.raw) || VOID_ELEMENTS.has(name);
    index = tag.end;

    if (!selfClosing && (name === 'style' || name === 'script')) {
      const closePattern = new RegExp(`<\\/${name}\\s*>`, 'ig');
      closePattern.lastIndex = index;
      const close = closePattern.exec(source);
      if (!close) {
        errors.push({ index: open, message: `unclosed <${name}>` });
        break;
      }
      node.children.push({ name: '#text', text: source.slice(index, close.index), attributes: new Map(), children: [], parent: node, start: index });
      node.end = closePattern.lastIndex;
      index = closePattern.lastIndex;
    } else if (!selfClosing) {
      stack.push(node);
    }
  }

  for (const node of stack.slice(1).reverse()) errors.push({ index: node.start, message: `unclosed <${node.name}>` });
  if (!hasDoctype) errors.push({ index: 0, message: 'missing <!DOCTYPE html>' });
  return { root, comments, errors };
}

function elements(root) {
  const result = [];
  const visit = node => {
    if (node.name !== '#root' && node.name !== '#text') result.push(node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return result;
}

function descendants(node, predicate) {
  const result = [];
  const visit = current => {
    for (const child of current.children) {
      if (child.name !== '#text' && predicate(child)) result.push(child);
      visit(child);
    }
  };
  visit(node);
  return result;
}

function textContent(node) {
  if (node.name === '#text') return node.text;
  return node.children.map(textContent).join('');
}

function classes(node) {
  return new Set((node.attributes.get('class') ?? '').split(/\s+/).filter(Boolean));
}

function hasAncestor(node, attribute) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.attributes?.has(attribute)) return true;
  }
  return false;
}

function splitSelectors(prelude) {
  const selectors = [];
  let start = 0;
  let quote = '';
  let square = 0;
  let round = 0;
  for (let i = 0; i < prelude.length; i += 1) {
    const char = prelude[i];
    if (quote) {
      if (char === quote && prelude[i - 1] !== '\\') quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '[') square += 1;
    else if (char === ']') square -= 1;
    else if (char === '(') round += 1;
    else if (char === ')') round -= 1;
    else if (char === ',' && square === 0 && round === 0) {
      selectors.push(prelude.slice(start, i).trim());
      start = i + 1;
    }
  }
  selectors.push(prelude.slice(start).trim());
  return selectors.filter(Boolean);
}

function findUnquoted(source, target, start = 0) {
  let quote = '';
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === quote && source[i - 1] !== '\\') quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === target) return i;
  }
  return -1;
}

function matchingBrace(source, open) {
  let depth = 0;
  let quote = '';
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === quote && source[i - 1] !== '\\') quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return i;
  }
  return -1;
}

function validateScopedCss(css, id) {
  const errors = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const root = new RegExp(`^\\.vx-visual\\s*\\[\\s*data-visual-id\\s*=\\s*(["'])${escaped}\\1\\s*\\](?=$|[\\s>+~.#:\\[])`);
  const allowedWrappers = /^@(media|supports|container|layer)\b/i;

  const inspectRules = block => {
    let cursor = 0;
    while (cursor < block.length) {
      const open = findUnquoted(block, '{', cursor);
      if (open === -1) {
        if (block.slice(cursor).trim().replace(/^;+|;+$/g, '').trim()) errors.push('unparsed CSS outside a rule');
        break;
      }
      const prelude = block.slice(cursor, open).trim().replace(/^;+/, '').trim();
      const close = matchingBrace(block, open);
      if (close === -1) {
        errors.push('unbalanced CSS braces');
        break;
      }
      const body = block.slice(open + 1, close);
      if (prelude.startsWith('@')) {
        if (!allowedWrappers.test(prelude)) errors.push(`unsupported per-visual at-rule ${prelude.split(/\s|\{/)[0]}`);
        else inspectRules(body);
      } else {
        for (const selector of splitSelectors(prelude)) {
          if (!root.test(selector)) errors.push(`unscoped selector ${selector}`);
        }
      }
      cursor = close + 1;
    }
  };

  inspectRules(clean);
  if (/:root\b|--plan-[\w-]+\s*:/.test(clean)) errors.push('page theme mutation');
  if (/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|hwb|lab|lch|oklab|oklch)\s*\(/i.test(clean)) errors.push('hard-coded color value');
  const themedProperty = /(?:^|[;{])\s*(color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?|box-shadow|text-shadow|fill|stroke)\s*:\s*([^;}]+)/gi;
  for (const match of clean.matchAll(themedProperty)) {
    const value = match[2];
    if (!/var\(\s*--plan-|\b(?:transparent|currentcolor|inherit|initial|unset|none)\b|^\s*0(?:\s+0)*\s*$/i.test(value)) {
      errors.push(`theme property ${match[1]} does not consume a --plan-* token`);
    }
  }
  return errors;
}

function validate(source, { complete = false } = {}) {
  const errors = [];
  const add = (message, index = 0) => errors.push(`line ${lineNumber(source, index)}: ${message}`);
  const parsed = parseHtml(source);
  for (const error of parsed.errors) add(error.message, error.index);
  const nodes = elements(parsed.root);

  const html = nodes.filter(node => node.name === 'html' && node.parent === parsed.root);
  if (html.length !== 1) add(`expected one root <html>, found ${html.length}`);
  const head = html[0]?.children.filter(node => node.name === 'head') ?? [];
  const body = html[0]?.children.filter(node => node.name === 'body') ?? [];
  if (head.length !== 1) add(`expected one direct <head>, found ${head.length}`);
  if (body.length !== 1) add(`expected one direct <body>, found ${body.length}`);
  if (head[0] && body[0] && head[0].start > body[0].start) add('<head> must precede <body>', head[0].start);
  const mains = body[0] ? descendants(body[0], node => node.name === 'main') : [];
  if (mains.length !== 1) add(`expected one <main> in <body>, found ${mains.length}`);

  for (const comment of parsed.comments) {
    if (/\bVISUAL_SLOT\b/.test(comment.text)) add('unresolved visual slot comment', comment.start);
  }
  for (const node of nodes) {
    if (classes(node).has('visual-slot')) add('unresolved visual-slot element', node.start);
  }
  for (const match of source.matchAll(/\{\{[\s\S]*?\}\}/g)) add(`unresolved placeholder ${match[0].replace(/\s+/g, ' ').slice(0, 80)}`, match.index);

  const styles = nodes.filter(node => node.name === 'style');
  const canonicalStyles = styles.filter(node => node.attributes.get('id') === 'planf3-style');
  if (styles.length !== 1 || canonicalStyles.length !== 1) add(`expected exactly one <style id="planf3-style"> block, found ${canonicalStyles.length} canonical of ${styles.length} total`);
  const css = canonicalStyles[0] ? textContent(canonicalStyles[0]) : '';
  if (/@import\b|url\s*\(/i.test(css)) add('style block contains an imported or URL-backed asset', canonicalStyles[0]?.start ?? 0);

  for (const node of nodes) {
    if (RESOURCE_ELEMENTS.has(node.name)) add(`resource-bearing <${node.name}> is not self-contained`, node.start);
    if (['src', 'srcset', 'poster'].some(attribute => node.attributes.has(attribute))) add(`<${node.name}> has a resource URL attribute`, node.start);
    if (node.name === 'input' && node.attributes.get('type')?.toLowerCase() === 'image') add('<input type="image"> is resource-bearing', node.start);
    if (node.parent?.name === 'p' && BLOCK_ELEMENTS.has(node.name)) add(`block <${node.name}> is not valid inside <p>`, node.start);
    const style = node.attributes.get('style') ?? '';
    if (/url\s*\(/i.test(style)) add('inline style contains a URL-backed asset', node.start);
    if ((node.name === 'use' || node.name === 'image') && [...node.attributes].some(([key, value]) => (key === 'href' || key === 'xlink:href') && !value.startsWith('#'))) {
      add(`<${node.name}> references an external resource`, node.start);
    }
  }

  for (const key of META_KEYS) {
    const found = nodes.filter(node => node.attributes.get('data-planf3-meta') === key);
    if (found.length !== 1) add(`expected one metadata hook ${key}, found ${found.length}`);
    else {
      if (found[0].name !== 'dd') add(`metadata hook ${key} must be on <dd>`, found[0].start);
      const value = textContent(found[0]).trim();
      if (!value) add(`metadata hook ${key} must contain a value`, found[0].start);
      if (key === 'created' && /^none$/i.test(value)) add('created metadata must contain a concrete value', found[0].start);
    }
  }

  const amendments = nodes.filter(node => node.name === 'section' && node.attributes.get('id') === 'amendments');
  if (amendments.length !== 1) add(`expected one #amendments section, found ${amendments.length}`);

  const planBriefs = nodes.filter(node => classes(node).has('plan-brief'));
  const planNavs = nodes.filter(node => classes(node).has('plan-nav'));
  if (planBriefs.length > 0 || planNavs.length > 0) {
    if (planBriefs.length !== 1) add(`presentation shell requires one .plan-brief, found ${planBriefs.length}`);
    if (planNavs.length !== 1) add(`presentation shell requires one .plan-nav, found ${planNavs.length}`);
    if (planBriefs[0]) {
      const briefItems = descendants(planBriefs[0], node => classes(node).has('plan-brief-item'));
      if (briefItems.length !== 4) add(`plan brief requires four .plan-brief-item elements, found ${briefItems.length}`, planBriefs[0].start);
      for (const item of briefItems) {
        if (!textContent(item).trim()) add('plan brief item must contain text', item.start);
      }
    }
    if (planNavs[0]) {
      if (planNavs[0].name !== 'nav') add('.plan-nav must be a <nav>', planNavs[0].start);
      const links = descendants(planNavs[0], node => node.name === 'a');
      const targets = new Set();
      for (const link of links) {
        const href = link.attributes.get('href') ?? '';
        if (!/^#[A-Za-z][\w:.-]*$/.test(href)) {
          add('plan navigation links must use a non-empty fragment href', link.start);
          continue;
        }
        const id = href.slice(1);
        if (targets.has(id)) add(`duplicate plan navigation target #${id}`, link.start);
        targets.add(id);
        const matches = nodes.filter(node => node.attributes.get('id') === id);
        if (matches.length !== 1) add(`plan navigation target #${id} resolves to ${matches.length} elements`, link.start);
      }
      for (const id of PRESENTATION_SECTION_IDS) {
        const sections = nodes.filter(node => node.name === 'section' && node.attributes.get('id') === id);
        if (sections.length !== 1) add(`presentation shell requires one section #${id}, found ${sections.length}`);
        if (!targets.has(id)) add(`plan navigation is missing #${id}`);
      }
    }
  }

  const associatedStatuses = new Set();
  for (const hook of HOOKS) {
    const attribute = `data-planf3-${hook}`;
    const found = nodes.filter(node => node.attributes.has(attribute));
    if (found.length === 0) add(`expected at least one ${attribute} hook`);
    const ids = new Set();
    for (const node of found) {
      const id = node.attributes.get(attribute);
      if (!id) add(`${attribute} must not be empty`, node.start);
      if (ids.has(id)) add(`duplicate ${attribute} value ${id}`, node.start);
      ids.add(id);
      if (hook === 'task' && !hasAncestor(node, 'data-planf3-phase')) add(`task ${id} is outside a phase`, node.start);
      if (hook === 'check' && !hasAncestor(node, 'data-planf3-task')) add(`check ${id} is outside a task`, node.start);

      let target = node;
      if (hook === 'phase' || hook === 'task') {
        const headingName = hook === 'phase' ? 'h3' : 'h4';
        const headings = node.children.filter(child => child.name === headingName);
        if (headings.length !== 1) {
          add(`${hook} ${id} must have one direct <${headingName}> heading`, node.start);
          continue;
        }
        target = headings[0];
      }
      const statuses = descendants(target, child => child.name === 'code' && classes(child).has('status'));
      if (statuses.length !== 1) {
        add(`${hook} ${id} must own exactly one status, found ${statuses.length}`, node.start);
        continue;
      }
      const value = textContent(statuses[0]).trim().toLowerCase();
      if (!VALID_STATUSES.has(value)) add(`invalid status ${value || '(empty)'}`, statuses[0].start);
      if (complete && (value === '[]' || value === '[wip]')) add(`unresolved completion status ${value}`, statuses[0].start);
      if (associatedStatuses.has(statuses[0])) add(`one status is shared by multiple lifecycle hooks`, statuses[0].start);
      associatedStatuses.add(statuses[0]);
    }
  }
  const allStatuses = nodes.filter(node => node.name === 'code' && classes(node).has('status'));
  for (const status of allStatuses) {
    if (!associatedStatuses.has(status)) add('orphan status element', status.start);
  }

  const visuals = nodes.filter(node => node.attributes.has('data-visual-id'));
  const visualIds = new Set();
  for (const node of visuals) {
    const id = node.attributes.get('data-visual-id');
    if (!id) add('data-visual-id must not be empty', node.start);
    if (visualIds.has(id)) add(`duplicate data-visual-id ${id}`, node.start);
    visualIds.add(id);
    if (node.name !== 'figure' || !classes(node).has('vx-visual')) add(`visual ${id} must be a <figure class="vx-visual">`, node.start);
  }

  const globalStarts = [...css.matchAll(/\/\*\s*PLANF3:VISUALS:START\s*\*\//g)];
  const globalEnds = [...css.matchAll(/\/\*\s*PLANF3:VISUALS:END\s*\*\//g)];
  if (globalStarts.length !== 1 || globalEnds.length !== 1) add(`expected one PLANF3:VISUALS START and END marker, found ${globalStarts.length} START and ${globalEnds.length} END`);
  const globalStart = globalStarts[0]?.index ?? -1;
  const globalEnd = globalEnds[0]?.index ?? -1;
  if (globalStart >= globalEnd && globalEnd !== -1) add('PLANF3:VISUALS START must precede END');

  const regionMarkers = [...css.matchAll(/\/\*\s*PLANF3:VISUAL:([^:*\s]+):(START|END)\s*\*\//g)];
  const regions = new Map();
  const regionSpans = [];
  let active = null;
  for (const marker of regionMarkers) {
    const [, id, kind] = marker;
    if (kind === 'START') {
      if (active) add(`nested CSS region ${id} inside ${active.id}`);
      if (regions.has(id)) add(`duplicate CSS region ${id}`);
      active = { id, contentStart: marker.index + marker[0].length, start: marker.index };
    } else if (!active || active.id !== id) {
      add(`CSS region END ${id} has no matching START`);
    } else {
      regions.set(id, css.slice(active.contentStart, marker.index));
      regionSpans.push({ start: active.start, end: marker.index + marker[0].length });
      if (globalStart !== -1 && (active.start < globalStart || marker.index > globalEnd)) add(`CSS region ${id} is outside PLANF3:VISUALS boundaries`);
      active = null;
    }
  }
  if (active) add(`CSS region ${active.id} has no END marker`);

  if (globalStarts.length === 1 && globalEnds.length === 1 && globalStart < globalEnd) {
    const contentStart = globalStart + globalStarts[0][0].length;
    let cursor = contentStart;
    let outsideRegions = '';
    for (const span of regionSpans.sort((a, b) => a.start - b.start)) {
      if (span.start >= contentStart && span.end <= globalEnd) {
        outsideRegions += css.slice(cursor, span.start);
        cursor = span.end;
      }
    }
    outsideRegions += css.slice(cursor, globalEnd);
    if (outsideRegions.replace(/\/\*[\s\S]*?\*\//g, '').trim()) add('CSS exists inside PLANF3:VISUALS boundaries but outside a requested-ID region');
  }

  for (const [id, regionCss] of regions) {
    if (!visualIds.has(id)) add(`CSS region ${id} has no matching visual`);
    for (const message of validateScopedCss(regionCss, id)) add(`CSS region ${id}: ${message}`);
  }

  return errors;
}

function fixture() {
  return `<!DOCTYPE html>
<html><head><style id="planf3-style">:root { --plan-canvas: #000; }
/* PLANF3:VISUALS:START */
/* PLANF3:VISUALS:END */
</style></head><body><main>
<dl>${META_KEYS.map(key => `<dt>${key}</dt><dd data-planf3-meta="${key}">${key === 'created' ? '2026-01-01T00:00:00Z' : 'None'}</dd>`).join('')}</dl>
<section data-planf3-phase="1"><h3><code class="status">[]</code> Phase</h3>
<div data-planf3-task="1.1"><h4><code class="status">[]</code> Task</h4>
<ul><li data-planf3-check="1.1.1"><code class="status">[]</code> Check</li></ul></div></section>
<ul><li data-planf3-validation="global-1"><code class="status">[]</code> Validate</li></ul>
<p>The literal text VISUAL_SLOT is allowed outside comments.</p>
<section id="amendments"><p data-planf3-empty="amendments">No amendments yet.</p></section>
</main></body></html>`;
}

function withVisual(source, css = `.vx-visual[data-visual-id='problem'] .metric { color: var(--plan-accent); }`) {
  return source
    .replace('/* PLANF3:VISUALS:END */', `/* PLANF3:VISUAL:problem:START */\n${css}\n/* PLANF3:VISUAL:problem:END */\n/* PLANF3:VISUALS:END */`)
    .replace('</main>', '<figure class="vx-visual" data-visual-id="problem"><p class="metric">Problem</p></figure></main>');
}

function selfTest() {
  const valid = fixture();
  const presentationShell = `<div class="plan-brief">
<div class="plan-brief-item">Outcome</div><div class="plan-brief-item">Scope</div>
<div class="plan-brief-item">Seam</div><div class="plan-brief-item">Acceptance</div></div>
<nav class="plan-nav">${PRESENTATION_SECTION_IDS.map(id => `<a href="#${id}">${id}</a>`).join('')}</nav>
${PRESENTATION_SECTION_IDS.filter(id => id !== 'amendments').map(id => `<section id="${id}"><h2>${id}</h2></section>`).join('')}`;
  const presented = valid.replace('<dl>', `${presentationShell}<dl>`);
  const orphan = valid.replace('<h3><code class="status">[]</code> Phase</h3>', '<h3>Phase</h3>').replace('</main>', '<code class="status">[]</code></main>');
  const sharedStatus = valid
    .replace('data-planf3-check="1.1.1"', 'data-planf3-check="1.1.1" data-planf3-validation="global-1"')
    .replace('\n<ul><li data-planf3-validation="global-1"><code class="status">[]</code> Validate</li></ul>', '');
  const cases = [
    ['valid fixture', valid, true],
    ['valid presentation shell', presented, true],
    ['valid single-quoted visual selector', withVisual(valid), true],
    ['broken presentation anchor', presented.replace('href="#risks"', 'href="#missing"'), false],
    ['incomplete plan brief', presented.replace('<div class="plan-brief-item">Acceptance</div>', ''), false],
    ['partial presentation shell', valid.replace('<dl>', '<div class="plan-brief"><div class="plan-brief-item">Outcome</div></div><dl>'), false],
    ['missing presentation section', presented.replace('<section id="contracts"><h2>contracts</h2></section>', ''), false],
    ['placeholder', valid.replace('Phase', '{{PHASE}}'), false],
    ['visual slot', valid.replace('</main>', '<figure class="visual-slot"><!-- VISUAL_SLOT --></figure></main>'), false],
    ['local image dependency', valid.replace('</main>', '<img src="local.png"></main>'), false],
    ['crossed tags', valid.replace('</main></body>', '</body></main>'), false],
    ['orphan status substitution', orphan, false],
    ['bad visual root', withVisual(valid).replace('<figure class="vx-visual"', '<div class="vx-visual"').replace('</figure></main>', '</div></main>'), false],
    ['unscoped visual CSS', withVisual(valid, `.vx-visual[data-visual-id="problem"] .metric { color: var(--plan-accent); } .leak { color: red; }`), false],
    ['broken global boundaries', valid.replace('PLANF3:VISUALS:END', 'PLANF3:VISUALS:START'), false],
    ['CSS outside requested-ID regions', valid.replace('/* PLANF3:VISUALS:END */', '.leak { color: red; }\n/* PLANF3:VISUALS:END */'), false],
    ['status shared by hooks', sharedStatus, false],
    ['image input dependency', valid.replace('</main>', '<input type="image" src="local.png"></main>'), false],
    ['block content inside paragraph', valid.replace('</main>', '<p>bad<div>block</div></p></main>'), false],
  ];
  for (const [name, source, shouldPass] of cases) {
    const errors = validate(source);
    if (shouldPass && errors.length !== 0) throw new Error(`${name}: expected zero errors, found ${errors.join('; ')}`);
    if (!shouldPass && errors.length === 0) throw new Error(`${name}: expected at least one error`);
  }
  const completed = valid.replaceAll('[]', '[x]');
  if (validate(completed, { complete: true }).length !== 0) throw new Error('completed fixture should pass --complete');
  if (validate(valid, { complete: true }).length === 0) throw new Error('idle fixture should fail --complete');
  console.log(`PASS ${cases.length + 2} validator self-checks`);
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--self-test') {
  selfTest();
  process.exit(0);
}
const complete = args.includes('--complete');
const files = args.filter(arg => arg !== '--complete');
if (files.length === 0) {
  console.error('Usage: node scripts/validate-plan.mjs [--complete] <plan.html> [...] | --self-test');
  process.exit(2);
}

let failed = false;
for (const file of files) {
  const resolved = path.resolve(file);
  let source;
  try {
    source = fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    console.error(`FAIL ${file}: ${error.message}`);
    failed = true;
    continue;
  }
  const errors = validate(source, { complete });
  if (errors.length) {
    failed = true;
    console.error(`FAIL ${file}`);
    for (const error of errors) console.error(`  - ${error}`);
  } else {
    console.log(`PASS ${file}`);
  }
}
process.exit(failed ? 1 : 0);
