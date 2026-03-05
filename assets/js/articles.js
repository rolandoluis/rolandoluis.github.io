(() => {
  const menuContainer = document.querySelector(".categories");
  const listContainer = document.getElementById("articlesList");

  const iframe = document.getElementById("articleIframe");
  const iframeSection = document.getElementById("iframeSection");
  const articlesContent = document.getElementById("articlesContent");
  const closeBtn = document.getElementById("backToArticles");
  const layout = document.getElementById("articlesLayout") || document.querySelector(".articles-layout");

  // Solo corre si estamos en Articles
  if (!menuContainer || !listContainer || !iframe || !iframeSection || !articlesContent) return;

  const lang = window.siteLang || document.documentElement.lang || "es";
  const ORIGIN = window.location.origin;

  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function urlForArticle(slug) {
    return `${ORIGIN}/${lang}/articles/${slug}.html`;
  }

  function markActive(slug) {
    qsa(".article-link.is-active").forEach(a => a.classList.remove("is-active"));
    qsa(`.article-link[data-article="${CSS.escape(slug)}"]`).forEach(a => a.classList.add("is-active"));
  }

  function openArticle(slug, { pushHash = true } = {}) {
    if (!slug) return;

    iframe.src = urlForArticle(slug);
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
    iframe.src = "";

    if (layout) layout.classList.remove("is-reading");

    qsa(".article-link.is-active").forEach(a => a.classList.remove("is-active"));

    if (clearHash && location.hash) {
      history.replaceState(null, "", location.pathname);
    }
  }

  function getHashSlug() {
    return (location.hash || "").replace(/^#/, "").trim();
  }

  function sortArticles(list) {
    // Por ahora: A→Z por título (estable y simple)
    // Si luego añades date, lo cambiamos a "más reciente primero".
    return [...list].sort((a, b) => (a.title || "").localeCompare(b.title || "", lang));
  }

  function groupByCategory(items) {
    const grouped = new Map();
    for (const a of items) {
      const cat = a.category || (lang === "en" ? "General" : "General");
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push(a);
    }
    return grouped;
  }

  function renderSidebar(grouped) {
    menuContainer.innerHTML = "";

    for (const [cat, list] of grouped.entries()) {
      const details = document.createElement("details");
      details.className = "category";
      details.setAttribute("name", "acordeon");

      const summary = document.createElement("summary");
      summary.className = "category-btn";
      summary.textContent = cat;

      const ul = document.createElement("ul");
      ul.className = "category-list";

      sortArticles(list).forEach(a => {
        const li = document.createElement("li");
        const desc = a.description ? ` title="${escapeHtml(a.description)}"` : "";
        li.innerHTML = `<a href="#${a.slug}" class="article-link" data-article="${escapeHtml(a.slug)}"${desc}>${escapeHtml(a.title)}</a>`;
        ul.appendChild(li);
      });

      details.appendChild(summary);
      details.appendChild(ul);
      menuContainer.appendChild(details);
    }

    // Fallback acordeón: solo uno abierto
    const allDetails = qsa('details.category[name="acordeon"]', menuContainer);
    allDetails.forEach(d => {
      d.addEventListener("toggle", () => {
        if (!d.open) return;
        allDetails.forEach(other => { if (other !== d) other.removeAttribute("open"); });
      });
    });
  }

  function renderCards(items) {
    // Cards: todas, ordenadas por categoría y título
    // Si prefieres mostrar solo “destacados”, lo filtramos aquí.
    const grouped = groupByCategory(items);

    // Puedes decidir si quieres separar por categoría con headers
    // Te dejo con headers (queda muy pro y claro):
    listContainer.innerHTML = "";

    for (const [cat, list] of grouped.entries()) {
      const h = document.createElement("h2");
      h.className = "articles-section-title";
      h.textContent = cat;

      const wrap = document.createElement("div");
      wrap.className = "articles-cards";

      sortArticles(list).forEach(a => {
        const card = document.createElement("div");
        card.className = "article-card";
        card.innerHTML = `
          <h3>
            <a href="#${escapeHtml(a.slug)}" class="article-link" data-article="${escapeHtml(a.slug)}">
              ${escapeHtml(a.title)}
            </a>
          </h3>
          <p>${escapeHtml(a.description || "")}</p>
        `;
        wrap.appendChild(card);
      });

      listContainer.appendChild(h);
      listContainer.appendChild(wrap);
    }
  }

  async function loadArticlesJson() {
    const res = await fetch(`/assets/data/${lang}/articles.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading articles.json`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("articles.json must be an array");
    return data;
  }

  // Delegación para sidebar + cards
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

  // Auto-resize del iframe (si el artículo manda postMessage)
  window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "articleHeight") return;
    // Seguridad opcional:
    // if (e.origin !== ORIGIN) return;
    iframe.style.height = (Number(e.data.height) + 20) + "px";
  });

  // Boot
  (async () => {
    try {
      const items = await loadArticlesJson();
      const grouped = groupByCategory(items);
      renderSidebar(grouped);
      renderCards(items);
    } catch (err) {
      console.warn("[articles.js]", err);
      listContainer.innerHTML = `<p style="color:var(--muted)">No se pudieron cargar los artículos.</p>`;
    }

    const initial = getHashSlug();
    if (initial) openArticle(initial, { pushHash: false });
    else closeArticle({ clearHash: false });
  })();
})();