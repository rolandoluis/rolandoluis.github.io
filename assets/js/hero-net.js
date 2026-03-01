(() => {
  const canvas = document.getElementById("heroNet");
  if (!canvas) return;

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let w = 0, h = 0;

  // Network parameters (sutiles y seguros)
  const N = 42;      // nodos
  const R = 120;     // radio conexión
  const V = 0.22;    // velocidad

  const nodes = [];
  let raf = 0;

  // --- Color utilities: read CSS --accent and convert to RGB -------------
  function hexToRgb(hex) {
    const s = hex.replace("#", "").trim();
    if (s.length === 3) {
      const r = parseInt(s[0] + s[0], 16);
      const g = parseInt(s[1] + s[1], 16);
      const b = parseInt(s[2] + s[2], 16);
      return { r, g, b };
    }
    if (s.length === 6) {
      const r = parseInt(s.slice(0, 2), 16);
      const g = parseInt(s.slice(2, 4), 16);
      const b = parseInt(s.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  }

  function parseCssColorToRgb(value) {
    const v = (value || "").trim();

    // #rgb or #rrggbb
    if (v.startsWith("#")) return hexToRgb(v);

    // rgb(r,g,b) or rgba(r,g,b,a)
    const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };

    // Fallback: default accent (classic)
    return { r: 225, g: 29, b: 72 };
  }

  function getAccentRgb() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent");
    return parseCssColorToRgb(v);
  }

  let accent = getAccentRgb();

  // If you change theme, update accent without reloading
  const themeObserver = new MutationObserver(() => {
    accent = getAccentRgb();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // --- Canvas sizing ------------------------------------------------------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.floor(rect.width);
    h = Math.floor(rect.height);

    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (!nodes.length) {
      for (let i = 0; i < N; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * V,
          vy: (Math.random() - 0.5) * V,
          r: 1.2 + Math.random() * 1.6
        });
      }
    }
  }

  // --- Animation ----------------------------------------------------------
  function step() {
    ctx.clearRect(0, 0, w, h);

    const lineAlphaBase = 0.055; // intensidad líneas
    const dotAlpha = 0.62;       // intensidad puntos

    // Move + bounce
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;

      n.x = Math.max(0, Math.min(w, n.x));
      n.y = Math.max(0, Math.min(h, n.y));
    }

    // Links
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < R * R) {
          const d = Math.sqrt(d2);
          const t = 1 - (d / R);

          ctx.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b},${lineAlphaBase * t})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (const n of nodes) {
      ctx.fillStyle = `rgba(229,231,235,${dotAlpha})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle vignette
    const g = ctx.createRadialGradient(w * 0.35, h * 0.30, 40, w * 0.5, h * 0.5, Math.max(w, h));
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    raf = requestAnimationFrame(step);
  }

  // ResizeObserver
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  window.addEventListener("resize", resize, { passive: true });

  resize();
  step();
})();