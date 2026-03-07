(() => {
  // -------------------- DOM guards --------------------
  const menu = document.getElementById("categoriesMenu");
  const list = document.getElementById("articlesList");

  const iframe = document.getElementById("articleIframe");
  const iframeSection = document.getElementById("iframeSection");
  const articlesContent = document.getElementById("articlesContent");
  const closeBtn = document.getElementById("backToArticles");
  const layout = document.getElementById("articlesLayout") || document.querySelector(".articles-layout");

  // Solo corre si estamos en la página Articles y existen los nodos clave
  if (!menu || !list || !iframe || !iframeSection || !articlesContent) return;

  // -------------------- Lang + URLs --------------------
  const getLangFromPath = (p) => {
    if (p.startsWith("/en/")) return "en";
    if (p.startsWith("/es/")) return "es";
    return null;
  };

  const lang =
    window.siteLang ||
    getLangFromPath(window.location.pathname) ||
    (document.documentElement.lang || "es");

  const ORIGIN = window.location.origin;

  const urlForArticle = (slug) => `${ORIGIN}/${lang}/articles/${slug}.html`;

  // -------------------- Helpers --------------------
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeArticle(a) {
    const clean = (v) => (typeof v === "string" ? v.trim() : "");

    return {
      title: clean(a.title),
      category: clean(a.category),
      slug: clean(a.slug),
      description: clean(a.description),
      date: clean(a.date),
      updated: clean(a.updated),
      tags: Array.isArray(a.tags) ? a.tags.filter(Boolean) : [], // <- nunca null
      featured: !!a.featured,
    };
  }

  function isPlaceholderArticle(a) {
    if (!a.slug || !a.title || !a.category) return true;
    if (a.slug.toLowerCase().includes("article_base")) return true;
    if (a.title.includes("[") || a.category.includes("[")) return true;
    return false;
  }

  function sortArticles(arr) {
    // featured primero, luego updated/date desc, luego title asc
    return [...arr].sort((x, y) => {
      if (x.featured !== y.featured) return x.featured ? -1 : 1;

      const dx = new Date(x.updated || x.date || "1900-01-01");
      const dy = new Date(y.updated || y.date || "1900-01-01");
      if (dx.getTime() !== dy.getTime()) return dy - dx;

      return (x.title || "").localeCompare((y.title || ""), lang);
    });
  }

  function groupByCategory(items) {
    const map = new Map();
    for (const it of items) {
      const cat = it.category || (lang === "en" ? "General" : "General");
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(it);
    }

    // Orden de categorías (alfabético por ahora)
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0], lang)));
  }

  async function loadArticlesJson() {
    const res = await fetch(`/assets/data/${lang}/articles.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading articles.json`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("articles.json must be an array");
    return data;
  }

  // -------------------- UI: Active link + hash --------------------
  function markActive(slug) {
    qsa(".article-link.is-active").forEach(a => a.classList.remove("is-active"));
    qsa(`.article-link[data-article="${CSS.escape(slug)}"]`).forEach(a => a.classList.add("is-active"));
  }

  function getHashSlug() {
    return (location.hash || "").replace(/^#/, "").trim();
  }

  // -------------------- View: iframe open/close --------------------
  function openArticle(slug, { pushHash = true } = {}) {
    if (!slug) return;

    iframe.src = urlForArticle(slug);

    iframe.onload = () => {
      buildReaderNavigation();
    };
    
    iframeSection.hidden = false;
    articlesContent.hidden = true;

    if (layout) layout.classList.add("is-reading");

    markActive(slug);

    if (pushHash && location.hash !== `#${slug}`) {
      history.replaceState(null, "", `#${slug}`);
    }
  }

  function closeArticle({ clearHash = true } = {}) {
    iframeSection.hidden = true;
    articlesContent.hidden = false;

    // libera recursos
    iframe.src = "";

    if (layout) layout.classList.remove("is-reading");

    qsa(".article-link.is-active").forEach(a => a.classList.remove("is-active"));

    if (clearHash && location.hash) {
      history.replaceState(null, "", location.pathname);
    }
  }

  let readerSections = [];
  let readerCurrent = 0;

  const readerProgress = document.getElementById("readerProgress");
  const readerProgressBar = document.getElementById("readerProgressBar");
  const readerProgressSteps = document.getElementById("readerProgressSteps");
  const readerPrev = document.getElementById("readerPrev");
  const readerNext = document.getElementById("readerNext");

  function buildReaderNavigation() {
    if (!iframe.contentDocument) return;

    const doc = iframe.contentDocument;
    readerSections = Array.from(doc.querySelectorAll(".article-body h2"));

    if (!readerSections.length) {
      readerProgress.hidden = true;
      return;
    }

    readerProgress.hidden = false;
    readerProgressSteps.innerHTML = "";
    readerCurrent = 0;

    readerSections.forEach((_, idx) => {
      const step = document.createElement("button");
      step.type = "button";
      step.className = "progress-step";
      step.textContent = String(idx + 1);

      step.addEventListener("click", () => {
        readerCurrent = idx;
        goToReaderSection(readerCurrent);
      });

      readerProgressSteps.appendChild(step);
    });

    updateReaderNavigation();
  }

  function goToReaderSection(index) {
    if (!iframe.contentDocument || !readerSections[index]) return;

    readerCurrent = index;

    readerSections[index].scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    updateReaderNavigation();
  }

  function updateReaderNavigation() {
    const steps = Array.from(readerProgressSteps.children);
    const total = steps.length;

    steps.forEach((step, idx) => {
      step.classList.remove("active", "done");

      if (idx < readerCurrent) step.classList.add("done");
      if (idx === readerCurrent) step.classList.add("active");
    });

    const percent = total > 1
      ? (readerCurrent / (total - 1)) * 100
      : 0;

    readerProgressBar.style.width = `${percent}%`;

    readerPrev.disabled = readerCurrent <= 0;
    readerNext.disabled = readerCurrent >= total - 1;
  }

  if (readerPrev) {
    readerPrev.addEventListener("click", () => {
      if (readerCurrent > 0) {
        goToReaderSection(readerCurrent - 1);
      }
    });
  }

  if (readerNext) {
    readerNext.addEventListener("click", () => {
      if (readerCurrent < readerSections.length - 1) {
        goToReaderSection(readerCurrent + 1);
      }
    });
  }


  // -------------------- Render: Sidebar --------------------
  function renderSidebar(categoriesMap) {
    menu.innerHTML = "";

    for (const [cat, items] of categoriesMap.entries()) {
      const details = document.createElement("details");
      details.className = "category";
      details.setAttribute("name", "acordeon"); // OK para Chromium, pero damos fallback

      const summary = document.createElement("summary");
      summary.className = "category-btn";
      summary.textContent = cat;

      const ul = document.createElement("ul");
      ul.className = "category-list";

      sortArticles(items).forEach(it => {
        const li = document.createElement("li");

        // tooltip opcional con description
        const titleAttr = it.description ? ` title="${escapeHtml(it.description)}"` : "";

        li.innerHTML =
          `<a href="#${escapeHtml(it.slug)}" class="article-link" data-article="${escapeHtml(it.slug)}"${titleAttr}>` +
          `${escapeHtml(it.title)}` +
          `</a>`;

        ul.appendChild(li);
      });

      details.appendChild(summary);
      details.appendChild(ul);
      menu.appendChild(details);
    }

    // Acordeón real: solo 1 abierto (fallback + consistente)
    menu.addEventListener("toggle", (e) => {
      const opened = e.target;
      if (!(opened instanceof HTMLDetailsElement)) return;
      if (!opened.open) return;

      menu.querySelectorAll("details.category[open]").forEach(d => {
        if (d !== opened) d.open = false;
      });
    }, { passive: true });
  }

  // -------------------- Render: Cards --------------------
  function renderCards(categoriesMap) {
    list.innerHTML = "";

    for (const [cat, items] of categoriesMap.entries()) {
      const h = document.createElement("h2");
      h.className = "articles-section-title";
      h.textContent = cat;

      const wrap = document.createElement("div");
      wrap.className = "articles-cards";

      sortArticles(items).forEach(it => {
        const card = document.createElement("div");
        card.className = "article-card";
        card.innerHTML = `
          <h3>
            <a href="#${escapeHtml(it.slug)}" class="article-link" data-article="${escapeHtml(it.slug)}">
              ${escapeHtml(it.title)}
            </a>
          </h3>
          <p>${escapeHtml(it.description || "")}</p>
        `;
        wrap.appendChild(card);
      });

      list.appendChild(h);
      list.appendChild(wrap);
    }
  }

  // -------------------- Events --------------------
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".article-link[data-article]");
    if (!a) return;

    e.preventDefault();
    const slug = a.getAttribute("data-article");
    openArticle(slug, { pushHash: true });
  });

  if (closeBtn) closeBtn.addEventListener("click", () => closeArticle({ clearHash: true }));

  window.addEventListener("hashchange", () => {
    const slug = getHashSlug();
    if (slug) openArticle(slug, { pushHash: false });
    else closeArticle({ clearHash: false });
  });

  // Auto-resize del iframe
  window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "articleHeight") return;
    //iframe.style.height = (Number(e.data.height) + 20) + "px";
  });

  // -------------------- Boot --------------------
  (async () => {
    try {
      const raw = await loadArticlesJson();

      const items = raw
        .map(normalizeArticle)
        .filter(a => !isPlaceholderArticle(a));

      if (!items.length) {
        menu.innerHTML = "";
        list.innerHTML = `<div class="article-card"><h3>Sin artículos</h3><p>Aún no hay entradas publicadas en este idioma.</p></div>`;
        closeArticle({ clearHash: false });
        return;
      }

      const grouped = groupByCategory(items);

      renderSidebar(grouped);
      renderCards(grouped);

      const initial = getHashSlug();
      if (initial) openArticle(initial, { pushHash: false });
      else closeArticle({ clearHash: false });

    } catch (err) {
      console.error("[articles.js]", err);
      list.innerHTML = `<div class="article-card"><h3>Error</h3><p>No se pudieron cargar los artículos.</p></div>`;
    }
  })();

})();