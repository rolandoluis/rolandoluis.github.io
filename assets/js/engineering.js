(() => {
  const layout = document.getElementById("engineeringLayout");
  const heroLinks = document.getElementById("engineeringHeroLinks");
  const list = document.getElementById("engineeringList");

  const content = document.getElementById("engineeringContent");
  const reader = document.getElementById("engineeringReader");
  const toc = document.getElementById("engineeringToc");

  const iframe = document.getElementById("engineeringIframe");
  const title = document.getElementById("engineeringReaderTitle");

  const progress = document.getElementById("engineeringReaderProgress");
  const progressBar = document.getElementById("engineeringProgressBar");
  const progressSteps = document.getElementById("engineeringProgressSteps");
  const prevBtn = document.getElementById("engineeringPrev");
  const nextBtn = document.getElementById("engineeringNext");

  if (!layout || !list || !content || !reader || !iframe) return;

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

  function urlForDoc(slug) {
    return `${origin}/${lang}/engineering/${slug}.html`;
  }

  async function loadEngineeringJson() {
    const res = await fetch(`/assets/data/${lang}/engineering.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading engineering.json`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("engineering.json must be an array");
    return data;
  }

  function renderHeroLinks(items) {
    if (!heroLinks) return;
    heroLinks.innerHTML = "";

    const featured = items.filter(x => x.featured).slice(0, 3);

    featured.forEach(doc => {
      const a = document.createElement("a");
      a.className = "category-btn";
      a.href = `#${doc.slug}`;
      a.dataset.doc = doc.slug;
      a.textContent = doc.title;
      heroLinks.appendChild(a);
    });
  }

  function renderCards(items) {
    list.innerHTML = "";

    items.forEach(doc => {
      const card = document.createElement("article");
      card.className = "engineering-card";
      card.innerHTML = `
        <a href="#${doc.slug}" class="engineering-card-link" data-doc="${doc.slug}">
          <h3>${doc.title}</h3>
          <p>${doc.description || ""}</p>
        </a>
      `;
      list.appendChild(card);
    });
  }

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
    progress.hidden = true;
    history.replaceState(null, "", location.pathname);
  }

  function buildReaderNavigation() {
    if (!iframe.contentDocument) return;

    const doc = iframe.contentDocument;
    const h1s = Array.from(doc.querySelectorAll(".article-body h1, main h1"));
    readerSections = h1s.length ? h1s : Array.from(doc.querySelectorAll(".article-body h2"));

    toc.innerHTML = "";

    readerSections.forEach((el, idx) => {
      if (!el.id) el.id = `eng-section-${idx + 1}`;

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
      progress.hidden = true;
      return;
    }

    progress.hidden = false;
    progressSteps.innerHTML = "";
    readerCurrent = 0;

    readerSections.forEach((_, idx) => {
      const step = document.createElement("button");
      step.type = "button";
      step.className = "engineering-progress-step";
      step.textContent = String(idx + 1);

      step.addEventListener("click", () => {
        readerCurrent = idx;
        goToSection(readerCurrent);
      });

      progressSteps.appendChild(step);
    });

    updateProgress();
  }

  function goToSection(index) {
    const target = readerSections[index];
    if (!target || !iframe.contentWindow) return;

    readerCurrent = index;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    updateProgress();
  }

  function updateProgress() {
    const steps = Array.from(progressSteps.children);
    const total = steps.length;

    steps.forEach((step, idx) => {
      step.classList.toggle("active", idx === readerCurrent);
    });

    const percent = total > 1 ? (readerCurrent / (total - 1)) * 100 : 0;
    progressBar.style.width = `${percent}%`;

    prevBtn.disabled = readerCurrent <= 0;
    nextBtn.disabled = readerCurrent >= total - 1;
  }

  function openDoc(slug) {
    const docMeta = docs.find(x => x.slug === slug);
    if (!docMeta) return;

    enterReaderMode();
    title.textContent = docMeta.title;
    iframe.src = urlForDoc(slug);

    iframe.onload = () => {
      buildReaderNavigation();
    };

    history.replaceState(null, "", `#${slug}`);
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-doc]");
    if (!link) return;

    e.preventDefault();
    openDoc(link.dataset.doc);
  });

  prevBtn?.addEventListener("click", () => {
    if (readerCurrent > 0) goToSection(readerCurrent - 1);
  });

  nextBtn?.addEventListener("click", () => {
    if (readerCurrent < readerSections.length - 1) goToSection(readerCurrent + 1);
  });

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "articleHeight") return;
    // reservado por si más adelante vuelves a auto-height
  });

  (async () => {
    try {
      docs = await loadEngineeringJson();
      renderHeroLinks(docs);
      renderCards(docs);

      const initial = (location.hash || "").replace(/^#/, "").trim();
      if (initial) openDoc(initial);
      else exitReaderMode();

    } catch (err) {
      console.error("[engineering.js]", err);
      list.innerHTML = `<article class="engineering-card"><h3>Error</h3><p>No se pudieron cargar los documentos de ingeniería.</p></article>`;
    }
  })();
})();