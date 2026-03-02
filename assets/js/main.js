(() => {
  const DEBUG = false;

  const path = window.location.pathname;

  const getLangFromPath = (p) => {
    if (p.startsWith("/en/")) return "en";
    if (p.startsWith("/es/")) return "es";
    return null;
  };

  const currentLang = getLangFromPath(path); // "es" | "en" | null

  const log = (...args) => {
    if (DEBUG) console.log(...args);
  };

  // 1) Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 2) Language-aware links (optional but useful)
  // Use: <a data-i18n-link="pages/projects.html">...</a>
  // It becomes: /es/pages/projects.html or /en/pages/projects.html
  if (currentLang) {
    document.querySelectorAll("[data-i18n-link]").forEach(el => {
      const target = (el.getAttribute("data-i18n-link") || "").replace(/^\/+/, "");
      const href = `/${currentLang}/${target}`;
      el.setAttribute("href", href);
      log("[i18n-link]", { target, href });
    });
  }

  // 3) Active nav link (works with bilingual prefixes)
  // Strategy:
  // - Compare "logical" paths with language stripped: /es/pages/projects.html -> /pages/projects.html
  // - Mark active if current logical path equals link logical path OR starts with it (for sections)
  const logicalPath = currentLang ? path.replace(/^\/(es|en)/, "") : path; // remove language prefix only
  document.querySelectorAll(".nav-link").forEach(a => {
    const href = a.getAttribute("href");
    if (!href) return;

    // If nav uses data-i18n-link, it might have no href at load time; it will be set above.
    const resolved = a.getAttribute("href");
    if (!resolved) return;

    const linkLogical = currentLang ? resolved.replace(/^\/(es|en)/, "") : resolved;

    // Normalize: remove trailing slash (except root)
    const norm = (p) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

    const cur = norm(logicalPath);
    const lnk = norm(linkLogical);

    // Exact match, or section match (e.g., /projects/... should keep Projects active)
    const isActive =
      (lnk === "/" && cur === "/") ||
      (lnk !== "/" && (cur === lnk || cur.startsWith(lnk.replace(/\.html$/, "")) || cur.startsWith(lnk.replace(/\/index\.html$/, ""))));

    if (isActive) a.classList.add("is-active");
  });

  // 4) Language switcher (preserve path, one implementation)
  // HTML: <button data-set-lang="es">ES</button> <button data-set-lang="en">EN</button>
  if (currentLang) {
    document.querySelectorAll("[data-set-lang]").forEach(btn => {
      const lang = btn.getAttribute("data-set-lang");
      btn.classList.toggle("is-active", lang === currentLang);

      // avoid double-binding if JS re-runs for any reason
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";

      btn.addEventListener("click", () => {
        const targetLang = btn.getAttribute("data-set-lang");
        localStorage.setItem("site_lang", targetLang);

        const p = window.location.pathname;
        const rest = p.replace(/^\/(es|en)\//, ""); // remove current lang prefix
        const next = `/${targetLang}/${rest}${window.location.search}${window.location.hash}`;

        log("[lang-switch]", { from: currentLang, to: targetLang, rest, next });
        window.location.assign(next);
      });
    });
  }
  document.querySelectorAll("[data-i18n-link]").forEach(el => {
    if (!el.getAttribute("href")) {
      el.setAttribute("href", "#");
    }
  });
})();

// --- Breadcrumb ------------------------------------------------
(() => {

  const bc = document.getElementById("breadcrumb");
  if (!bc) return;

  const fullPath = window.location.pathname;
  const lang = fullPath.startsWith("/en/") ? "en" : "es";

  const path = fullPath
    .replace(/^\/(es|en)\//,"")
    .replace(/\.html$/,"");

  const parts = path.split("/").filter(Boolean);

  const labels = {
    es:{ "":"Inicio","pages":"Secciones","projects":"Proyectos","articles":"Artículos","lab":"Lab","about":"Sobre mí"},
    en:{ "":"Home","pages":"Sections","projects":"Projects","articles":"Articles","lab":"Lab","about":"About"}
  };

  const sectionPages = {
    pages:"pages/projects.html",
    projects:"pages/projects.html",
    articles:"pages/articles.html",
    lab:"pages/lab.html",
    about:"pages/about.html"
  };

  let url = `/${lang}/`;
  bc.innerHTML = `<a href="${url}">${labels[lang][""]}</a>`;

  parts.forEach((p,i)=>{

    if(sectionPages[p]){
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
    { box: document.getElementById("searchBox"),        results: document.getElementById("searchResults") },
    { box: document.getElementById("searchBoxMobile"),  results: document.getElementById("searchResultsMobile") },
  ].filter(p => p.box && p.results);

  if (!pairs.length) return;

  const emptyMsg = lang === "en" ? "No results" : "Sin resultados";

  let index = [];

  fetch("/assets/data/search.json")
    .then(r => r.json())
    .then(data => {
      index = data.filter(p => p.lang === lang);
    })
    .catch(() => {
      // si falla la carga, no rompemos la UI
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
    // input
    box.addEventListener("input", () => {
      render(box.value, results);
    });

    // enter => results page
    box.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        results.style.display = "none";
        return;
      }

      if (e.key === "Enter") {
        const q = box.value.trim();
        if (q.length > 1) {
          closeMobileNavIfOpen();
          window.location.href = `/${lang}/pages/search.html?q=` + encodeURIComponent(q);
        }
      }
    });

    // click a result => close drawer
    results.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) closeMobileNavIfOpen();
    });

    // click outside => close results
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

  if (saved) {
    document.documentElement.dataset.theme = saved;
  } else {
    document.documentElement.dataset.theme = "classic";
  }

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

  // cerrar al tocar fuera del panel
  panel.addEventListener("click", (e) => {
    if (e.target === panel) close();
  });

  // cerrar con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  // cerrar al navegar (clic en link)
  panel.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => close());
  });
})();

// --- Card spotlight ------------------------------------
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