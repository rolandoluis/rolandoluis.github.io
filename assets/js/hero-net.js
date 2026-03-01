(() => {
  const canvas = document.getElementById("heroNet");
  if (!canvas) return;

  const prefersReduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const forceAnimate = localStorage.getItem("hero_anim") === "on";
  const animate = forceAnimate ? true : !prefersReduceMotion;

  const ctx = canvas.getContext("2d", { alpha: true });

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let w = 0, h = 0;

  // Ajustes visuales (tenue y elegante)
  const N = 32;
  const R = 240;
  const V = 0.18;

  const LINE_ALPHA_BASE = 0.16;
  const DOT_ALPHA = 0.22;

  const nodes = [];

  // Mouse (FUERA del drawFrame)
  const mouse = { x: null, y: null };

  const host = canvas.closest(".hero-canvas") || canvas.parentElement;
  host.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });

  host.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  }, { passive: true });

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
    if (v.startsWith("#")) return hexToRgb(v);
    const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return { r: 225, g: 29, b: 72 };
  }

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

  const themeObserver = new MutationObserver(() => {
    accent = getAccentRgb();
    drawFrame(false);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.floor(rect.width);
    h = Math.floor(rect.height);

    if (w <= 0 || h <= 0) return false;

    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (!nodes.length) {
      for (let i = 0; i < N; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          ox: null,
          oy: null,
          vx: (Math.random() - 0.5) * V,
          vy: (Math.random() - 0.5) * V,
          r: 1.2 + Math.random() * 1.6,
        });
      }
    }

    return true;
  }

  function drawFrame(move = false) {
    ctx.clearRect(0, 0, w, h);
  
    if (move) {
      for (const n of nodes) {
        // Movimiento base
        n.x += n.vx;
        n.y += n.vy;
      
        // Interacción sutil con el cursor (más visible, con caída suave)
        if (mouse.x !== null) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
      
          const radius = 320; // área de influencia (más grande = se nota más)
          if (dist < radius && dist > 0.001) {
            const pull = 1 - (dist / radius); // 0..1
            const strength = 0.010;           // sube/baja si quieres más/menos efecto
          
            n.x += dx * strength * pull;
            n.y += dy * strength * pull;
          }
        }
      
        // Rebote en bordes
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      
        // Clamp dentro del canvas
        n.x = Math.max(0, Math.min(w, n.x));
        n.y = Math.max(0, Math.min(h, n.y));
      }
    }
  
    // Links
    ctx.lineCap = "round";
    ctx.lineWidth = 1.25;
  
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
      
        if (d2 < R * R) {
          const d = Math.sqrt(d2);
          const t = 1 - d / R;
      
          ctx.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b},${LINE_ALPHA_BASE * t})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  
    // Nodes (tenues y teñidos)
    for (const n of nodes) {
      ctx.fillStyle = `rgba(${accent.r},${accent.g},${accent.b},${DOT_ALPHA})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  
    // Vignette suave (mejora contraste del texto)
    const g = ctx.createRadialGradient(
      w * 0.35, h * 0.30, 40,
      w * 0.5, h * 0.5, Math.max(w, h)
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.26)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // DEBUG mouse marker (temporal)
  if (mouse.x !== null) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Resize observers
  const ro = new ResizeObserver(() => {
    if (resize()) drawFrame(false);
  });
  ro.observe(canvas);

  window.addEventListener("resize", () => {
    if (resize()) drawFrame(false);
  }, { passive: true });

  if (!resize()) return;

  // reduce motion: render 1 frame estático
  if (!animate) {
    drawFrame(false);
    return;
  }

  // Pause when tab hidden
  let running = true;

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
  });

  function loop() {
    if (running) drawFrame(true);
    requestAnimationFrame(loop);
  }

  loop();
})();