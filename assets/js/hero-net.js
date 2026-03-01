(() => {
  const canvas = document.getElementById("heroNet");
  if (!canvas) return;

  const DEBUG = false;

  const prefersReduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ctx = canvas.getContext("2d", { alpha: true });

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let w = 0, h = 0;

  const N = 34;
  const R = 220;
  const V = 0.22;

  const nodes = [];

  function hexToRgb(hex) {
    const s = hex.replace("#", "").trim();
    if (s.length === 3) {
      return {
        r: parseInt(s[0] + s[0], 16),
        g: parseInt(s[1] + s[1], 16),
        b: parseInt(s[2] + s[2], 16),
      };
    }
    if (s.length === 6) {
      return {
        r: parseInt(s.slice(0, 2), 16),
        g: parseInt(s.slice(2, 4), 16),
        b: parseInt(s.slice(4, 6), 16),
      };
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
  
    // fallback
    return { r: 225, g: 29, b: 72 };
  }

  /* function getAccentRgb() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const rgb = parseCssColorToRgb(v);
    if (!rgb || Number.isNaN(rgb.r) || Number.isNaN(rgb.g) || Number.isNaN(rgb.b)) {
      return { r: 225, g: 29, b: 72 };
    }
    return rgb;
  } */
  function getAccentRgb() {
    const rootStyle = getComputedStyle(document.documentElement);
  
    const raw =
      rootStyle.getPropertyValue("--accent-net").trim() ||
      rootStyle.getPropertyValue("--accent").trim();
  
    const rgb = parseCssColorToRgb(raw);
  
    if (!rgb || [rgb.r, rgb.g, rgb.b].some(n => Number.isNaN(n))) {
      return { r: 225, g: 29, b: 72 };
    }
    return rgb;
  }


  let accent = getAccentRgb();

  // actualiza color cuando cambie el tema
  const themeObserver = new MutationObserver(() => {
    accent = getAccentRgb();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.floor(rect.width);
    h = Math.floor(rect.height);

    // si por alguna razón es 0, no seguimos
    if (w <= 0 || h <= 0) return false;

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
          r: 1.2 + Math.random() * 1.6,
        });
      }
    }

    return true;
  }

  function drawFrame(move = false) {
    const lineAlphaBase = 0.14;  // para que sea visible con #531515
    const dotAlpha = 0.62;
    const rawAccent = getComputedStyle(document.documentElement).getPropertyValue("--accent");
    // console.log("[accent raw]", JSON.stringify(rawAccent), "parsed:", accent);
    ctx.clearRect(0, 0, w, h);
    // DEBUG: línea forzada (si no se ve, hay un problema de render/capas)
    // ctx.strokeStyle = "rgba(0,255,0,0.45)"; // verde visible, ignora accent
    ctx.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b}, 1)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(w - 20, 20);
    ctx.stroke();
    

    if (move) {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        n.x = Math.max(0, Math.min(w, n.x));
        n.y = Math.max(0, Math.min(h, n.y));
      }
    }

    // links
    let links = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < R * R) {
          links++;
          const d = Math.sqrt(d2);
          const t = 1 - d / R;

          ctx.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b},${lineAlphaBase * t})`;
        //  ctx.strokeStyle = "rgba(0,255,0,0.45)"; // verde visible, ignora accent
          ctx.lineWidth = 1.35;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    console.log("[hero-net] links:", links, "accent:", accent, "R:", R, "w/h:", w, h);
    // nodes
    for (const n of nodes) {
      ctx.fillStyle = `rgba(229,231,235,${dotAlpha})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // vignette
    const g = ctx.createRadialGradient(
      w * 0.35,
      h * 0.3,
      40,
      w * 0.5,
      h * 0.5,
      Math.max(w, h)
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function loop() {
    drawFrame(true);
    requestAnimationFrame(loop);
  }

  // resize observers
  const ro = new ResizeObserver(() => {
    if (resize()) {
      // re-render inmediato tras resize
      drawFrame(false);
    }
  });
  ro.observe(canvas);

  window.addEventListener(
    "resize",
    () => {
      if (resize()) drawFrame(false);
    },
    { passive: true }
  );

  const ok = resize();
  if (!ok) return;

  if (DEBUG) {
    console.log("[hero-net]", {
      prefersReduceMotion,
      w,
      h,
      accent,
      theme: document.documentElement.dataset.theme,
    });
  }

  // si reduce motion: 1 frame estático, si no: animación
  if (prefersReduceMotion) {
    drawFrame(false);
    return;
  }

  loop();
})();