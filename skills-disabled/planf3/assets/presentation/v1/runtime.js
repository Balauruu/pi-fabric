(() => {
  'use strict';
  if (window.__planf3RuntimeV1) return;
  window.__planf3RuntimeV1 = true;

  const root = document.documentElement;
  const $ = (selector, node = document) => node.querySelector(selector);
  const $$ = (selector, node = document) => [...node.querySelectorAll(selector)];
  const live = $('#planf3-live');
  const announce = message => {
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = message; });
  };
  const safeStore = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  };
  const themes = ['terracotta-sage', 'teal-blueprint', 'cranberry-audit', 'midnight-editorial', 'warm-signal', 'terminal-mono', 'swiss-clean'];
  let mermaidModule;
  let elkRegistered = false;
  let chartPromise;
  let animePromise;

  const tokens = () => {
    const style = getComputedStyle(root);
    return {
      bg: style.getPropertyValue('--bg').trim(),
      surface: style.getPropertyValue('--surface').trim(),
      text: style.getPropertyValue('--text').trim(),
      dim: style.getPropertyValue('--text-dim').trim(),
      accent: style.getPropertyValue('--accent').trim(),
      accent2: style.getPropertyValue('--accent2').trim(),
      border: style.getPropertyValue('--border-bright').trim(),
      font: style.getPropertyValue('--font-body').trim(),
    };
  };

  function exportedHtml() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[data-runtime-generated], .chartjs-size-monitor').forEach(node => node.remove());
    clone.querySelectorAll('[data-controls-ready]').forEach(node => node.removeAttribute('data-controls-ready'));
    clone.querySelectorAll('.diagram-canvas').forEach(node => {
      node.replaceChildren();
      node.removeAttribute('style');
    });
    clone.querySelectorAll('.diagram-shell').forEach(node => node.removeAttribute('data-rendered'));
    clone.querySelectorAll('tr[data-planf3-file-index]').forEach(node => node.hidden = false);
    clone.querySelectorAll('[data-planf3-file-filter]').forEach(node => { node.value = ''; node.removeAttribute('value'); });
    clone.querySelectorAll('[data-planf3-file-result-count]').forEach(node => {
      const section = node.closest('#files');
      const count = section?.querySelectorAll('tr[data-planf3-file-index]').length || 0;
      node.textContent = `${count} ${count === 1 ? 'file' : 'files'}`;
    });
    return `<!DOCTYPE html>\n${clone.outerHTML}`;
  }

  function exportFile() {
    const name = `${(document.title || 'plan').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'plan'}.html`;
    return new File([exportedHtml()], name, { type: 'text/html' });
  }

  async function applyPresentation() {
    await Promise.allSettled([renderMermaid(), renderCharts()]);
  }

  const setTheme = (theme, persist = true) => {
    if (!themes.includes(theme)) return;
    root.dataset.planf3Theme = theme;
    if (persist) safeStore.set('planf3-theme', theme);
    announce(`Theme: ${theme}`);
    applyPresentation();
  };
  const setMode = (mode, persist = true) => {
    if (!['auto', 'light', 'dark'].includes(mode)) return;
    root.dataset.colorMode = mode;
    if (persist) safeStore.set('planf3-mode', mode);
    announce(`Color mode: ${mode}`);
    applyPresentation();
  };

  const themeSelect = $('[data-action="theme"]');
  const modeSelect = $('[data-action="color-mode"]');
  const storedTheme = safeStore.get('planf3-theme');
  const storedMode = safeStore.get('planf3-mode');
  if (storedTheme && themes.includes(storedTheme)) root.dataset.planf3Theme = storedTheme;
  if (storedMode && ['auto', 'light', 'dark'].includes(storedMode)) root.dataset.colorMode = storedMode;
  if (themeSelect) {
    themeSelect.value = root.dataset.planf3Theme;
    themeSelect.addEventListener('change', event => setTheme(event.target.value));
  }
  if (modeSelect) {
    modeSelect.value = root.dataset.colorMode;
    modeSelect.addEventListener('change', event => setMode(event.target.value));
  }

  function setupFileImpactFilter() {
    for (const input of $$('[data-planf3-file-filter]')) {
      const section = input.closest('#files');
      const rows = section ? $$('tr[data-planf3-file-index]', section) : [];
      const count = section ? $('[data-planf3-file-result-count]', section) : null;
      if (!rows.length || !count) continue;
      const update = () => {
        const query = input.value.trim().toLocaleLowerCase();
        let visible = 0;
        for (const row of rows) {
          const match = !query || row.textContent.toLocaleLowerCase().includes(query);
          row.hidden = !match;
          if (match) visible += 1;
        }
        count.textContent = `${visible} ${visible === 1 ? 'file' : 'files'}`;
      };
      input.addEventListener('input', update);
      update();
    }
  }

  function setupPage() {
    const links = $$('.toc a[href^="#"]');
    if (!links.length) return;
    const entries = links.map(link => [link, $(link.getAttribute('href'))]).filter(([, section]) => section);
    const activate = link => {
      if (!link) return;
      links.forEach(item => item.removeAttribute('aria-current'));
      link.setAttribute('aria-current', 'location');
      link.scrollIntoView({ block: 'nearest', inline: 'center' });
    };
    links.forEach(link => link.addEventListener('click', () => activate(link)));
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(items => {
      const visible = items.filter(item => item.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activate(entries.find(([, section]) => section === visible.target)?.[0]);
    }, { rootMargin: '-15% 0px -70%', threshold: [0, 0.2, 0.6] });
    entries.forEach(([, section]) => observer.observe(section));
  }


  function loadAnime() {
    animePromise ||= new Promise((resolve, reject) => {
      if (window.anime) return resolve(window.anime);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js';
      script.dataset.runtimeGenerated = 'anime';
      script.onload = () => resolve(window.anime);
      script.onerror = () => reject(new Error('anime.js failed to load'));
      document.head.append(script);
    });
    return animePromise;
  }

  function setupMotion() {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(item => item.classList.add('is-visible'));
      return;
    }
    const reveal = item => {
      if (item.closest('[data-motion="choreograph"]') && $$('[data-reveal]', item.parentElement).length >= 10) {
        loadAnime().then(anime => anime({ targets: $$('[data-reveal]', item.parentElement), translateY: [14, 0], delay: anime.stagger(55), duration: 420, easing: 'easeOutCubic' })).catch(() => item.classList.add('is-visible'));
      } else item.classList.add('is-visible');
    };
    if (!('IntersectionObserver' in window)) {
      items.forEach(reveal);
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    }), { threshold: 0 });
    items.forEach(item => observer.observe(item));
  }

  async function loadMermaid(needsElk) {
    mermaidModule ||= import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs').then(module => module.default);
    const mermaid = await mermaidModule;
    if (needsElk && !elkRegistered) {
      const elk = await import('https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs');
      mermaid.registerLayoutLoaders(elk.default);
      elkRegistered = true;
    }
    return mermaid;
  }

  function setupDiagramControls(shell) {
    if (shell.dataset.controlsReady) return;
    shell.dataset.controlsReady = 'true';
    const viewport = $('.diagram-viewport', shell);
    const canvas = $('.diagram-canvas', shell);
    const label = $('.diagram-zoom-label', shell);
    let scale = 1;
    let panX = 0;
    let panY = 0;
    const draw = () => {
      canvas.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
      if (label) label.textContent = `${Math.round(scale * 100)}%`;
    };
    const fit = () => {
      const svg = $('svg', canvas);
      if (!svg) return;
      canvas.style.transform = 'none';
      const bounds = svg.getBoundingClientRect();
      scale = Math.min(1, (viewport.clientWidth - 32) / Math.max(1, bounds.width), (viewport.clientHeight - 32) / Math.max(1, bounds.height));
      panX = 0;
      panY = 0;
      draw();
    };
    shell.__planf3Fit = fit;
    shell.addEventListener('click', event => {
      const action = event.target.closest('[data-diagram-action]')?.dataset.diagramAction;
      if (!action) return;
      if (action === 'zoom-in') scale = Math.min(4, scale + 0.2);
      if (action === 'zoom-out') scale = Math.max(0.25, scale - 0.2);
      if (action === 'actual-size') { scale = 1; panX = 0; panY = 0; }
      if (action === 'fit') fit();
      if (action === 'expand') {
        const svg = $('svg', canvas);
        if (svg) {
          const theme = tokens();
          const blob = new Blob([`<!DOCTYPE html><meta charset="utf-8"><title>${document.title} diagram</title><style>html,body{margin:0;min-height:100%;display:grid;place-items:center;background:${theme.bg};color:${theme.text}}svg{max-width:96vw;max-height:96vh}</style>${svg.outerHTML}`], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const opened = window.open(url, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          if (!opened) shell.requestFullscreen?.();
        }
      }
      draw();
    });
    if (!viewport.hasAttribute('tabindex')) viewport.tabIndex = 0;
    viewport.addEventListener('keydown', event => {
      if (event.key === '+') scale = Math.min(4, scale + 0.2);
      else if (event.key === '-') scale = Math.max(0.25, scale - 0.2);
      else if (event.key === '0') fit();
      else if (event.key === 'ArrowLeft') panX -= 20;
      else if (event.key === 'ArrowRight') panX += 20;
      else if (event.key === 'ArrowUp') panY -= 20;
      else if (event.key === 'ArrowDown') panY += 20;
      else return;
      event.preventDefault();
      draw();
    });
    viewport.addEventListener('wheel', event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const previous = scale;
      const next = Math.max(0.25, Math.min(4, scale + (event.deltaY < 0 ? 0.1 : -0.1)));
      const bounds = viewport.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      panX = x - (x - panX) * next / previous;
      panY = y - (y - panY) * next / previous;
      scale = next;
      draw();
    }, { passive: false });
    const points = new Map();
    let lastDistance = 0;
    viewport.addEventListener('pointerdown', event => {
      points.set(event.pointerId, [event.clientX, event.clientY]);
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', event => {
      if (!points.has(event.pointerId)) return;
      const old = points.get(event.pointerId);
      points.set(event.pointerId, [event.clientX, event.clientY]);
      if (points.size === 1) {
        panX += event.clientX - old[0];
        panY += event.clientY - old[1];
      } else {
        const pair = [...points.values()];
        const distance = Math.hypot(pair[0][0] - pair[1][0], pair[0][1] - pair[1][1]);
        if (lastDistance) scale = Math.max(0.25, Math.min(4, scale * distance / lastDistance));
        lastDistance = distance;
      }
      draw();
    });
    const release = event => { points.delete(event.pointerId); lastDistance = 0; };
    viewport.addEventListener('pointerup', release);
    viewport.addEventListener('pointercancel', release);
    viewport.addEventListener('dblclick', fit);
  }

  async function renderMermaid() {
    const shells = $$('.diagram-shell');
    if (!shells.length) return;
    for (const shell of shells) {
      setupDiagramControls(shell);
      delete shell.dataset.rendered;
      const source = $('.diagram-source', shell)?.textContent.trim();
      if (source && !shell.hasAttribute('data-planf3-execution-order') && !$('.diagram-fallback', shell)) {
        const fallback = document.createElement('pre');
        fallback.className = 'diagram-fallback';
        fallback.dataset.runtimeGenerated = 'diagram-fallback';
        const code = document.createElement('code');
        code.textContent = source;
        fallback.append(code);
        shell.append(fallback);
      }
    }
    const needsElk = shells.some(shell => shell.dataset.layout === 'elk');
    try {
      const mermaid = await loadMermaid(needsElk);
      const theme = tokens();
      for (const [index, shell] of shells.entries()) {
        const source = $('.diagram-source', shell)?.textContent.trim();
        const canvas = $('.diagram-canvas', shell);
        if (!source || !canvas) continue;
        mermaid.initialize({
          startOnLoad: false,
          layout: shell.dataset.layout === 'elk' ? 'elk' : 'dagre',
          theme: 'base',
          securityLevel: 'strict',
          themeVariables: {
            background: theme.bg,
            primaryColor: theme.surface,
            primaryBorderColor: theme.accent,
            primaryTextColor: theme.text,
            secondaryColor: theme.bg,
            secondaryTextColor: theme.text,
            lineColor: theme.dim,
            fontFamily: theme.font,
          },
        });
        const { svg } = await mermaid.render(`planf3-${Date.now()}-${index}`, source);
        const parsed = new DOMParser().parseFromString(`<body>${svg}</body>`, 'text/html');
        const rendered = $('svg', parsed);
        if (!rendered) throw new Error('Mermaid returned no SVG');
        canvas.replaceChildren(document.adoptNode(rendered));
        shell.dataset.rendered = 'true';
        requestAnimationFrame(() => shell.__planf3Fit?.());
      }
    } catch (error) {
      announce(`Diagram unavailable: ${error.message}`);
    }
  }

  function loadChart() {
    chartPromise ||= new Promise((resolve, reject) => {
      if (window.Chart) return resolve(window.Chart);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
      script.dataset.runtimeGenerated = 'chart';
      script.onload = () => resolve(window.Chart);
      script.onerror = () => reject(new Error('Chart.js failed to load'));
      document.head.append(script);
    });
    return chartPromise;
  }

  async function renderCharts() {
    const canvases = $$('canvas[data-chart-source]');
    if (!canvases.length) return;
    try {
      const Chart = await loadChart();
      const theme = tokens();
      for (const canvas of canvases) {
        const source = $(canvas.dataset.chartSource);
        if (!source) continue;
        canvas.__chart?.destroy();
        const config = JSON.parse(source.textContent);
        config.options ||= {};
        config.options.responsive = true;
        config.options.maintainAspectRatio ??= false;
        config.options.plugins ||= {};
        config.options.plugins.legend ||= {};
        config.options.plugins.legend.labels = { ...(config.options.plugins.legend.labels || {}), color: theme.text, font: { family: theme.font } };
        for (const dataset of config.data?.datasets || []) {
          dataset.borderColor ||= theme.accent;
          dataset.backgroundColor ||= theme.accent2;
        }
        canvas.__chart = new Chart(canvas, config);
      }
    } catch (error) {
      announce(`Chart unavailable: ${error.message}`);
    }
  }

  $('[data-action="download"]')?.addEventListener('click', () => {
    const file = exportFile();
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(file);
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    announce('HTML downloaded');
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (root.dataset.colorMode === 'auto') applyPresentation();
  });
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      $$('.diagram-shell').forEach(shell => shell.__planf3Fit?.());
      }, 120);
  });

  root.classList.add('planf3-enhanced');
  setupPage();
  setupFileImpactFilter();
  setupMotion();
  applyPresentation();
})();
