(() => {
  // ---------------------------------------------------------
  // DOM
  // ---------------------------------------------------------
  const layout = document.getElementById("engineeringLayout");
  const heroLinks = document.getElementById("engineeringHeroLinks");
  const list = document.getElementById("engineeringList");

  const content = document.getElementById("engineeringContent");
  const reader = document.getElementById("engineeringReader");
  const toc = document.getElementById("engineeringToc");

  const iframe = document.getElementById("engineeringIframe");
  const title = document.getElementById("engineeringReaderTitle");

  const progress = document.getElementById("engineeringReaderProgress");
  const counter = document.getElementById("engineeringReaderCounter");
  const prevBtn = document.getElementById("engineeringPrev");
  const nextBtn = document.getElementById("engineeringNext");
  const closeBtn = document.getElementById("engineeringClose");

  if (!layout || !list || !content || !reader || !iframe) return;

  // ---------------------------------------------------------
  // Estado
  // ---------------------------------------------------------
  const getLangFromPath = (p) => {
    if (p.startsWith("/en/")) return "en";
    if (p.startsWith("/es/")) return "es";
    return "es";
  };

  const lang = window.siteLang || getLangFromPath(location.pathname);
  const origin = location.origin;

  let docs = [];
  let readerSections = [];
  let readerCurrent = 0;
  let currentSlug = "";

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeDoc(doc) {
    const clean = (v) => (typeof v === "string" ? v.trim() : "");

    return {
      title: clean(doc.title),
      slug: clean(doc.slug),
      description: clean(doc.description),
      category: clean(doc.category),
      date: clean(doc.date),
      updated: clean(doc.updated),
      tags: Array.isArray(doc.tags) ? doc.tags.filter(Boolean) : [],
      featured: !!doc.featured,
      btnInHero: !!doc.btnInHero || !!doc.btn_in_hero || !!doc.heroButton
    };
  }

  function isPlaceholderDoc(doc) {
    if (!doc.slug || !doc.title) return true;
    if (doc.slug.toLowerCase().includes("base")) return true;
    if (doc.title.includes("[") || doc.category.includes("[")) return true;
    return false;
  }

  function sortDocs(items) {
    return [...items].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;

      const da = new Date(a.updated || a.date || "1900-01-01");
      const db = new Date(b.updated || b.date || "1900-01-01");
      if (da.getTime() !== db.getTime()) return db - da;

      return (a.title || "").localeCompare((b.title || ""), lang);
    });
  }

  function urlForDoc(slug) {
    return `${origin}/${lang}/engineering/${slug}.html?embed=engineering`;
  }

  async function loadEngineeringJson() {
    const res = await fetch(`/assets/data/${lang}/engineering.json`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} loading engineering.json`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("engineering.json must be an array");
    }

    return data;
  }

  // ---------------------------------------------------------
  // Render index
  // ---------------------------------------------------------
  function renderHeroLinks(items) {
    if (!heroLinks) return;

    heroLinks.innerHTML = "";

    const heroItems = sortDocs(items).filter((doc) => doc.btnInHero).slice(0, 6);

    heroItems.forEach((doc) => {
      const a = document.createElement("a");
      a.href = `#${doc.slug}`;
      a.className = "category-btn";
      a.dataset.doc = doc.slug;
      a.textContent = doc.title;
      heroLinks.appendChild(a);
    });
  }

  function renderCards(items) {
    list.innerHTML = "";

    const sorted = sortDocs(items);

    sorted.forEach((doc) => {
      const card = document.createElement("article");
      card.className = "engineering-card";

      card.innerHTML = `
        <a href="#${escapeHtml(doc.slug)}" class="engineering-card-link" data-doc="${escapeHtml(doc.slug)}">
          <h3>${escapeHtml(doc.title)}</h3>
          <p>${escapeHtml(doc.description || "")}</p>
        </a>
      `;

      list.appendChild(card);
    });
  }

  // ---------------------------------------------------------
  // Estado visual
  // ---------------------------------------------------------
  function enterReaderMode() {
    layout.classList.remove("is-index");
    layout.classList.add("is-reading");

    content.hidden = true;
    reader.hidden = false;
  }

  function exitReaderMode() {
    layout.classList.remove("is-reading");
    layout.classList.add("is-index");

    reader.hidden = true;
    content.hidden = false;

    iframe.src = "";
    toc.innerHTML = "";

    readerSections = [];
    readerCurrent = 0;
    currentSlug = "";

    if (progress) progress.hidden = true;
    if (counter) counter.textContent = "0 / 0";
    if (title) title.textContent = "Documento";

    history.replaceState(null, "", location.pathname);
  }

  // ---------------------------------------------------------
  // Reader navigation
  // ---------------------------------------------------------
  function buildReaderNavigation() {
    if (!iframe.contentDocument) return;

    const doc = iframe.contentDocument;

    // Preferimos h1 como “capítulos”
    const h1s = Array.from(doc.querySelectorAll(".engineering-doc-body h1, main h1"));
    readerSections = h1s.length
      ? h1s
      : Array.from(doc.querySelectorAll(".engineering-doc-body h2, main h2"));

    toc.innerHTML = "";

    readerSections.forEach((el, idx) => {
      if (!el.id) {
        el.id = `eng-section-${idx + 1}`;
      }

      const a = document.createElement("a");
      a.href = `#${el.id}`;
      a.textContent = el.textContent.trim();

      a.addEventListener("click", (e) => {
        e.preventDefault();
        readerCurrent = idx;
        goToSection(readerCurrent);
      });

      toc.appendChild(a);
    });

    buildProgress();
  }

  function buildProgress() {
    if (!readerSections.length) {
      if (progress) progress.hidden = true;
      if (counter) counter.textContent = "0 / 0";
      return;
    }

    if (progress) progress.hidden = false;

    readerCurrent = 0;
    updateProgress();
  }

  function updateProgress() {
    const total = readerSections.length;

    if (counter) {
      counter.textContent = total ? `${readerCurrent + 1} / ${total}` : "0 / 0";
    }

    if (prevBtn) prevBtn.disabled = readerCurrent <= 0;
    if (nextBtn) nextBtn.disabled = readerCurrent >= total - 1;

    // estado visual activo del TOC
    const links = Array.from(toc.querySelectorAll("a"));
    links.forEach((link, idx) => {
      link.classList.toggle("is-active", idx === readerCurrent);
    });
  }

  function goToSection(index) {
    const target = readerSections[index];
    if (!target) return;

    readerCurrent = index;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    updateProgress();
  }

  // ---------------------------------------------------------
  // Reader
  // ---------------------------------------------------------
  function openDoc(slug) {
    const docMeta = docs.find((x) => x.slug === slug);
    if (!docMeta) return;

    currentSlug = slug;

    enterReaderMode();

    if (title) {
      title.textContent = docMeta.title;
    }

    iframe.src = urlForDoc(slug);

    iframe.onload = () => {
      buildReaderNavigation();
    };

    history.replaceState(null, "", `#${slug}`);
  }

  // ---------------------------------------------------------
  // Events
  // ---------------------------------------------------------
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-doc]");
    if (!link) return;

    e.preventDefault();
    const slug = link.dataset.doc;
    if (!slug) return;

    openDoc(slug);
  });

  closeBtn?.addEventListener("click", () => {
    exitReaderMode();
  });

  prevBtn?.addEventListener("click", () => {
    if (readerCurrent > 0) {
      goToSection(readerCurrent - 1);
    }
  });

  nextBtn?.addEventListener("click", () => {
    if (readerCurrent < readerSections.length - 1) {
      goToSection(readerCurrent + 1);
    }
  });

  // ---------------------------------------------------------
  // Boot
  // ---------------------------------------------------------
  (async () => {
    try {
      const raw = await loadEngineeringJson();

      docs = raw
        .map(normalizeDoc)
        .filter((doc) => !isPlaceholderDoc(doc));

      if (!docs.length) {
        if (heroLinks) heroLinks.innerHTML = "";
        list.innerHTML = `
          <article class="engineering-card">
            <h3>Sin documentos</h3>
            <p>Aún no hay documentos de ingeniería publicados en este idioma.</p>
          </article>
        `;
        exitReaderMode();
        return;
      }

      renderHeroLinks(docs);
      renderCards(docs);

      const initial = (location.hash || "").replace(/^#/, "").trim();
      if (initial) {
        openDoc(initial);
      } else {
        exitReaderMode();
      }

    } catch (err) {
      console.error("[engineering.js]", err);

      list.innerHTML = `
        <article class="engineering-card">
          <h3>Error</h3>
          <p>No se pudieron cargar los documentos de ingeniería.</p>
        </article>
      `;

      exitReaderMode();
    }
  })();
})();