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

// --- Simple static search -------------------------------------
(() => {

  const box = document.getElementById("searchBox");
  const results = document.getElementById("searchResults");
  if(!box || !results) return;

  const lang = window.location.pathname.startsWith("/en/") ? "en" : "es";

  let index = [];

  fetch("/assets/data/search.json")
    .then(r => r.json())
    .then(data => {
      index = data.filter(p => p.lang === lang);
    });

  box.addEventListener("input", () => {

    const q = box.value.toLowerCase().trim();

    if(q.length < 2){
      results.style.display = "none";
      return;
    }

    const hits = index.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.join(" ").includes(q)
    ).slice(0,8);

    if(!hits.length){
      results.innerHTML = `<div style="padding:8px 10px">Sin resultados</div>`;
      results.style.display = "block";
      return;
    }

    results.innerHTML = hits.map(p =>
      `<a href="/${lang}/${p.url}">
         <strong>${p.title}</strong><br>
         <small>${p.excerpt}</small>
       </a>`
    ).join("");

    results.style.display = "block";
  });

  document.addEventListener("click", e=>{
    if(!results.contains(e.target) && e.target!==box){
      results.style.display="none";
    }
  });

})();