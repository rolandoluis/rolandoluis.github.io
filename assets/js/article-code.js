(() => {
  const escapeHtml = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  // Envuelve coincidencias con un span (sobre texto YA escapado)
  const wrap = (text, rx, cls) => text.replace(rx, (m) => `<span class="${cls}">${m}</span>`);

  // Para no romper lo ya envuelto, aplicamos en orden y evitando patrones demasiado “glotones”.
  function highlightJSON(raw) {
    let t = escapeHtml(raw);

    // Strings
    t = wrap(t, /"(?:\\.|[^"\\])*"/g, "tok-string");

    // Keys (string seguido de :)
    t = t.replace(/(<span class="tok-string">"(?:\\.|[^"\\])*"<\/span>)(\s*:\s*)/g,
      (_, s, colon) => `<span class="tok-key">${s}</span><span class="tok-punct">${colon}</span>`
    );

    // Numbers
    t = wrap(t, /-?\b\d+(?:\.\d+)?\b/g, "tok-number");

    // Booleans / null
    t = wrap(t, /\btrue\b|\bfalse\b/g, "tok-bool");
    t = wrap(t, /\bnull\b/g, "tok-null");

    // Punctuation
    t = wrap(t, /[{}\[\],]/g, "tok-punct");
    return t;
  }

  function highlightBash(raw) {
    let t = escapeHtml(raw);

    // Comments (# ... end line)
    t = t.replace(/(^|\n)\s*#.*(?=\n|$)/g, (m) => `<span class="tok-comment">${m}</span>`);

    // Strings
    t = wrap(t, /"(?:\\.|[^"\\])*"/g, "tok-string");
    t = wrap(t, /'(?:\\.|[^'\\])*'/g, "tok-string");

    // Variables
    t = wrap(t, /\$[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+\}/g, "tok-var");

    // Common keywords
    t = wrap(t, /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|in|select|until)\b/g, "tok-keyword");

    // Commands (first token of line) – simple heuristic
    t = t.replace(/(^|\n)(\s*)([a-zA-Z0-9_\-\.\/]+)(?=\s|$)/g, (m, br, sp, cmd) => {
      // ignore shebang
      if (cmd.startsWith("#!")) return m;
      return `${br}${sp}<span class="tok-fn">${cmd}</span>`;
    });

    return t;
  }

  function highlightPowerShell(raw) {
    let t = escapeHtml(raw);

    // Comments
    t = wrap(t, /#.*$/gm, "tok-comment");

    // Strings (double + single)
    t = wrap(t, /"(?:`.|\\.|[^"\\])*"/g, "tok-string");
    t = wrap(t, /'(?:''|[^'])*'/g, "tok-string");

    // Variables
    t = wrap(t, /\$[A-Za-z_][A-Za-z0-9_:]*/g, "tok-var");

    // Parameters
    t = wrap(t, /(?<![A-Za-z0-9_])-\w+(?:-\w+)*/g, "tok-param");

    // Types [TypeName]
    t = wrap(t, /\[[A-Za-z0-9_.]+\]/g, "tok-type");

    // Cmdlets Verb-Noun (heuristic)
    t = wrap(t, /\b[A-Z][a-zA-Z]+-[A-Z][a-zA-Z0-9]+\b/g, "tok-fn");

    // Keywords (subset útil)
    t = wrap(
      t,
      /\b(function|param|return|if|else|elseif|switch|foreach|for|while|do|break|continue|try|catch|finally|throw|class|enum|using|import-module|set-strictmode|begin|process|end)\b/gi,
      "tok-keyword"
    );

    // Numbers
    t = wrap(t, /-?\b\d+(?:\.\d+)?\b/g, "tok-number");

    return t;
  }

  function detectLang(codeEl) {
    const cls = (codeEl.className || "").toLowerCase();
    if (cls.includes("language-json")) return "json";
    if (cls.includes("language-bash") || cls.includes("language-sh") || cls.includes("language-shell")) return "bash";
    if (cls.includes("language-powershell") || cls.includes("language-ps1")) return "powershell";
    return null;
  }

  function applyHighlight(pre) {
    const code = pre.querySelector("code");
    if (!code) return;

    // Evita doble ejecución
    if (code.dataset.hl === "1") return;
    code.dataset.hl = "1";

    const lang = detectLang(code);
    if (!lang) {
      // Al menos escapamos para evitar “interpretación” accidental si alguien pegó < >
      code.innerHTML = escapeHtml(code.textContent);
      return;
    }

    const raw = code.textContent;

    if (lang === "json") code.innerHTML = highlightJSON(raw);
    if (lang === "bash") code.innerHTML = highlightBash(raw);
    if (lang === "powershell") code.innerHTML = highlightPowerShell(raw);
  }

  function addCopyButton(pre) {
    if (pre.querySelector(".code-copy")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.textContent = "Copy";

    btn.addEventListener("click", async () => {
      const code = pre.querySelector("code");
      if (!code) return;

      const text = code.textContent;
      try {
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = old), 900);
      } catch {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        const old = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = old), 900);
      }
    });

    pre.appendChild(btn);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".article-body pre").forEach(pre => {
      addCopyButton(pre);
      applyHighlight(pre);
    });
  });
})();