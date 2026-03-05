(() => {
  const DEBUG = false;

  const path = window.location.pathname;

  const getLangFromPath = (p) => {
    if (p.startsWith("/en/")) return "en";
    if (p.startsWith("/es/")) return "es";
    return null;
  };

  const currentLang = getLangFromPath(path); // "es" | "en" | null

  // Exponer idioma para otros scripts (articles.js, etc.)
  window.siteLang = currentLang || document.documentElement.lang || "es";

  const log = (...args) => {
    if (DEBUG) console.log(...args);
  };

  // 1) Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 2) Language-aware links
  if (currentLang) {
    document.querySelectorAll("[data-i18n-link]").forEach(el => {
      const target = (el.getAttribute("data-i18n-link") || "").replace(/^\/+/, "");
      const href = `/${currentLang}/${target}`;
      el.setAttribute("href", href);
      log("[i18n-link]", { target, href });
    });
  }

  // fallback href
  document.querySelectorAll("[data-i18n-link]").forEach(el => {
    if (!el.getAttribute("href")) el.setAttribute("href", "#");
  });

  // 3) Active nav link (strip language prefix)
  const logicalPath = currentLang ? path.replace(/^\/(es|en)/, "") : path;

  document.querySelectorAll(".nav-link").forEach(a => {
    const resolved = a.getAttribute("href");
    if (!resolved) return;

    const linkLogical = currentLang ? resolved.replace(/^\/(es|en)/, "") : resolved;

    const norm = (p) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
    const cur = norm(logicalPath);
    const lnk = norm(linkLogical);

    const isActive =
      (lnk === "/" && cur === "/") ||
      (lnk !== "/" && (cur === lnk || cur.startsWith(lnk.replace(/\.html$/, "")) || cur.startsWith(lnk.replace(/\/index\.html$/, ""))));

    if (isActive) a.classList.add("is-active");
  });

  // 4) Language switcher
  if (currentLang) {
    document.querySelectorAll("[data-set-lang]").forEach(btn => {
      const lang = btn.getAttribute("data-set-lang");
      btn.classList.toggle("is-active", lang === currentLang);

      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";

      btn.addEventListener("click", () => {
        const targetLang = btn.getAttribute("data-set-lang");
        localStorage.setItem("site_lang", targetLang);

        const p = window.location.pathname;
        const rest = p.replace(/^\/(es|en)\//, "");
        const next = `/${targetLang}/${rest}${window.location.search}${window.location.hash}`;

        log("[lang-switch]", { from: currentLang, to: targetLang, rest, next });
        window.location.assign(next);
      });
    });
  }
})();

// --- Breadcrumb ------------------------------------------------
(() => {
  const bc = document.getElementById("breadcrumb");
  if (!bc) return;

  const fullPath = window.location.pathname;
  const lang = fullPath.startsWith("/en/") ? "en" : "es";

  const path = fullPath
    .replace(/^\/(es|en)\//, "")
    .replace(/\.html$/, "");

  const parts = path.split("/").filter(Boolean);

  const labels = {
    es: { "": "Inicio", "pages": "Secciones", "projects": "Proyectos", "articles": "Artículos", "lab": "Lab", "about": "Sobre mí" },
    en: { "": "Home", "pages": "Sections", "projects": "Projects", "articles": "Articles", "lab": "Lab", "about": "About" }
  };

  const sectionPages = {
    pages: "pages/projects.html",
    projects: "pages/projects.html",
    articles: "pages/articles.html",
    lab: "pages/lab.html",
    about: "pages/about.html"
  };

  let url = `/${lang}/`;
  bc.innerHTML = `<a href="${url}">${labels[lang][""]}</a>`;

  parts.forEach((p) => {
    if (sectionPages[p]) {
      url = `/${lang}/${sectionPages[p]}`;
    } else {
      url += p + "/";
    }
    const label = labels[lang][p] || p.toUpperCase();
    bc.innerHTML += `<span>/</span><a href="${url}">${label}</a>`;
  });
})();

// --- Simple static search (desktop + mobile) -------------------
(() => {
  const lang = window.location.pathname.startsWith("/en/") ? "en" : "es";

  const pairs = [
    { box: document.getElementById("searchBox"),       results: document.getElementById("searchResults") },
    { box: document.getElementById("searchBoxMobile"), results: document.getElementById("searchResultsMobile") },
  ].filter(p => p.box && p.results);

  if (!pairs.length) return;

  const emptyMsg = lang === "en" ? "No results" : "Sin resultados";
  let index = [];

  fetch("/assets/data/search.json")
    .then(r => r.json())
    .then(data => { index = data.filter(p => p.lang === lang); })
    .catch(() => {
      pairs.forEach(({ results }) => {
        results.innerHTML = `<div style="padding:8px 10px">${emptyMsg}</div>`;
      });
    });

  const closeMobileNavIfOpen = () => {
    const panel = document.getElementById("mobileNav");
    const btn = document.querySelector(".nav-toggle");
    if (!panel || !btn) return;
    if (panel.hidden) return;

    panel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  const render = (q, resultsEl) => {
    const query = q.toLowerCase().trim();

    if (query.length < 2) {
      resultsEl.style.display = "none";
      resultsEl.innerHTML = "";
      return;
    }

    const hits = index
      .filter(p =>
        (p.title || "").toLowerCase().includes(query) ||
        (p.excerpt || "").toLowerCase().includes(query) ||
        ((p.tags || []).join(" ").toLowerCase().includes(query))
      )
      .slice(0, 8);

    if (!hits.length) {
      resultsEl.innerHTML = `<div style="padding:8px 10px">${emptyMsg}</div>`;
      resultsEl.style.display = "block";
      return;
    }

    resultsEl.innerHTML = hits.map(p =>
      `<a href="/${lang}/${p.url}">
         <strong>${p.title}</strong><br>
         <small>${p.excerpt}</small>
       </a>`
    ).join("");

    resultsEl.style.display = "block";
  };

  pairs.forEach(({ box, results }) => {
    box.addEventListener("input", () => render(box.value, results));

    box.addEventListener("keydown", (e) => {
      if (e.key === "Escape") results.style.display = "none";

      if (e.key === "Enter") {
        const q = box.value.trim();
        if (q.length > 1) {
          closeMobileNavIfOpen();
          window.location.href = `/${lang}/pages/search.html?q=` + encodeURIComponent(q);
        }
      }
    });

    results.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) closeMobileNavIfOpen();
    });

    document.addEventListener("click", (e) => {
      if (!results.contains(e.target) && e.target !== box) {
        results.style.display = "none";
      }
    });
  });
})();

// Theme switcher (persist)
(() => {
  const KEY = "site_theme";
  const saved = localStorage.getItem(KEY);

  document.documentElement.dataset.theme = saved || "classic";

  document.querySelectorAll("[data-set-theme]").forEach(btn => {
    const theme = btn.getAttribute("data-set-theme");
    btn.classList.toggle("is-active", theme === document.documentElement.dataset.theme);

    if (btn.dataset.boundTheme === "1") return;
    btn.dataset.boundTheme = "1";

    btn.addEventListener("click", () => {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(KEY, theme);

      document.querySelectorAll("[data-set-theme]").forEach(b => {
        b.classList.toggle("is-active", b.getAttribute("data-set-theme") === theme);
      });
    });
  });
})();

// Hero anim toggle (if present)
(() => {
  const btn = document.getElementById("toggleAnim");
  if (!btn) return;

  const key = "hero_anim";
  const cur = localStorage.getItem(key) || "off";
  btn.textContent = cur === "on" ? "Animación: ON" : "Animación: OFF";

  btn.addEventListener("click", () => {
    const next = (localStorage.getItem(key) === "on") ? "off" : "on";
    localStorage.setItem(key, next);
    location.reload();
  });
})();

// Mobile nav
(() => {
  const btn = document.querySelector(".nav-toggle");
  const panel = document.getElementById("mobileNav");
  if (!btn || !panel) return;

  const open = () => {
    panel.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    panel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  btn.addEventListener("click", () => {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    expanded ? close() : open();
  });

  panel.addEventListener("click", (e) => {
    if (e.target === panel) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  panel.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => close());
  });
})();

// Card spotlight
(() => {
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--x", x + "px");
      card.style.setProperty("--y", y + "px");
    });
  });
})();