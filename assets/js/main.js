(() => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Active nav link
  const path = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach(a => {
      const href = a.getAttribute("href");
      if (!href) return;
      if (href === "/" && path === "/") a.classList.add("is-active");
      else if (href !== "/" && path.endsWith(href)) a.classList.add("is-active");
    });
  })();

  // Language preference
  document.querySelectorAll("[data-lang]").forEach(el => {
    el.addEventListener("click", () => {
      localStorage.setItem("site_lang", el.getAttribute("data-lang"));
    });
  });

  // --- Language-aware links -----------------------------------
  (function () {
  
    const path = window.location.pathname;
  
    let lang = "es";
  
    if (path.startsWith("/en/")) {
      lang = "en";
    }
  
    document.querySelectorAll("[data-i18n-link]").forEach(el => {
  
      const target = el.getAttribute("data-i18n-link");
  
      el.setAttribute("href", "/" + lang + "/" + target);
  
    });
  
  })();

    (() => {
      const path = window.location.pathname;
    
      // Detect current language from URL (/es/ or /en/)
      const currentLang = path.startsWith("/en/") ? "en" : (path.startsWith("/es/") ? "es" : null);
    
      // If we are not in /es or /en, do nothing (root router handles it)
      if (!currentLang) return;
    
      // Mark active language button
      document.querySelectorAll("[data-set-lang]").forEach(btn => {
        const lang = btn.getAttribute("data-set-lang");
        if (lang === currentLang) btn.classList.add("is-active");
    
        btn.addEventListener("click", () => {
          const targetLang = lang;
          localStorage.setItem("site_lang", targetLang);
        
          // Swap /es/ <-> /en/ while preserving the rest of the path
          const rest = path.replace(/^\/(es|en)\//, "");
          const next = `/${targetLang}/${rest}${window.location.search}${window.location.hash}`;
        
          window.location.assign(next);
        });
      });
    })();