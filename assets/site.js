/* ==========================================================================
   qaddodi.github.io — progressive enhancements
   The page is complete without JavaScript. Everything a reader does here
   (pins, recent, streak, theme) stays in this browser's
   localStorage under "qd:" keys and never leaves it.
   ========================================================================== */

(() => {
  "use strict";

  const dataEl = document.getElementById("site-data");
  if (!dataEl) return;
  let DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }

  const CFG = DATA.config || {};
  const DAY = 864e5;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const projects = DATA.projects || [];
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const sectionByType = Object.fromEntries((DATA.sections || []).map((s) => [s.type, s]));
  const hueOf = (p) => sectionByType[p?.type]?.hue || "ink";

  /* storage ---------------------------------------------------------------- */
  const store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem("qd:" + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem("qd:" + key, JSON.stringify(value)); } catch (e) {} },
    del(key) { try { localStorage.removeItem("qd:" + key); } catch (e) {} },
  };

  /* dates ------------------------------------------------------------------ */
  const pad2 = (n) => String(n).padStart(2, "0");
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const parseDay = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const fmtMonth = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
  const fmtDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  const fmtLong = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
  const ago = (t) => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 3600) return "just now";
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    const d = Math.floor(s / 86400);
    return d === 1 ? "yesterday" : `${d} d ago`;
  };

  /* helpers ---------------------------------------------------------------- */
  const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
    return node;
  };
  const glyphTpl = document.getElementById("glyph-templates");
  const glyphFor = (id) => {
    const src = glyphTpl?.content?.querySelector(`[data-glyph="${CSS.escape(id)}"] .glyph`);
    return src ? src.cloneNode(true) : null;
  };
  const decode = (s) => { const t = document.createElement("textarea"); t.innerHTML = s || ""; return t.value; };

  let toastTimer;
  const toast = (msg) => {
    const t = $("[data-toast]");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), 2200);
  };
  const copy = async (text, msg = "Copied") => {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = el("textarea", { style: "position:fixed;opacity:0" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e2) {}
      ta.remove();
    }
    toast(msg);
  };
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = el("script", { src, async: true, crossorigin: "anonymous" });
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
  const transition = (fn) => {
    if (document.startViewTransition && !reduceMotion) document.startViewTransition(fn);
    else fn();
  };
  const headH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--head-h")) || 64;

  /* ========================================================================
     theme
     ======================================================================== */
  const themeBtn = $("[data-theme-toggle]");
  const themeLabel = { auto: "automatic", light: "light", dark: "dark" };
  const applyTheme = (mode) => {
    if (mode === "light" || mode === "dark") document.documentElement.dataset.theme = mode;
    else delete document.documentElement.dataset.theme;
    if (themeBtn) {
      themeBtn.dataset.themeMode = mode;
      themeBtn.setAttribute("aria-label", `Color theme: ${themeLabel[mode]}`);
      themeBtn.title = `Theme: ${themeLabel[mode]}`;
    }
  };
  let theme = store.get("theme", "auto");
  if (!themeLabel[theme]) theme = "auto";
  applyTheme(theme);
  themeBtn?.addEventListener("click", () => {
    theme = theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
    if (theme === "auto") store.del("theme"); else store.set("theme", theme);
    transition(() => applyTheme(theme));
    toast(`Theme: ${themeLabel[theme]}`);
  });

  const now = Date.now();
  store.del("lastVisit"); // the "updated since your visit" badge is gone
  const plates = $$("article.plate");

  const renderBadges = () => {
    for (const plate of plates) {
      const added = parseDay(plate.dataset.added);
      const updated = parseDay(plate.dataset.updated);
      const badges = $("[data-badges]", plate);
      badges.textContent = "";
      const isNew = added && now - added.getTime() < (CFG.newDays || 45) * DAY;
      if (isNew) badges.append(el("span", { class: "badge badge--new", text: "New" }));

      const label = $("[data-updated-label]", plate);
      if (label && updated) {
        label.dateTime = plate.dataset.updated;
        label.textContent = fmtMonth.format(updated);
      }
    }
  };

  renderBadges();

  /* live freshness: each repo's latest commit date from GitHub, cached 12 h */
  const FRESH_TTL = 12 * 3600 * 1000;
  const applyFreshness = (dates) => {
    let changed = false;
    for (const plate of plates) {
      const d = dates[plate.dataset.project];
      if (d && d > (plate.dataset.updated || "")) { plate.dataset.updated = d; changed = true; }
    }
    if (changed) renderBadges();
  };
  const refreshFreshness = async () => {
    const cached = store.get("fresh");
    if (cached && cached.t && now - cached.t < FRESH_TTL && cached.dates) { applyFreshness(cached.dates); return; }
    const dates = {};
    let blocked = false;
    await Promise.allSettled(projects.filter((p) => p.repo).map(async (p) => {
      if (blocked) return;
      const q = new URLSearchParams({ per_page: "1" });
      if (p.path) q.set("path", p.path);
      const res = await fetch(`https://api.github.com/repos/${p.repo}/commits?${q}`, { headers: { Accept: "application/vnd.github+json" } });
      if (res.status === 403 || res.status === 429) { blocked = true; return; }
      if (!res.ok) return;
      const json = await res.json();
      const iso = json?.[0]?.commit?.committer?.date || json?.[0]?.commit?.author?.date;
      if (iso) dates[p.id] = dateKey(new Date(iso));
    }));
    if (Object.keys(dates).length) { store.set("fresh", { t: now, dates }); applyFreshness(dates); }
  };
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  if (plates.length) idle(() => refreshFreshness().catch(() => {}));

  /* ========================================================================
     shelf — pins and recently opened
     ======================================================================== */
  let pins = store.get("pins", []);
  let recent = store.get("recent", []);
  if (!Array.isArray(pins)) pins = [];
  if (!Array.isArray(recent)) recent = [];
  pins = pins.filter((id) => byId[id] && !byId[id].soon);
  recent = recent.filter((r) => r && byId[r.id] && !byId[r.id].soon);

  // every tool ever opened, for the guided paths (seeded from the recent list)
  let visited = store.get("visited", null);
  if (!visited || typeof visited !== "object" || Array.isArray(visited)) {
    visited = Object.fromEntries(recent.map((r) => [r.id, r.t]));
    store.set("visited", visited);
  }

  const track = (id) => {
    if (!byId[id]) return;
    recent = [{ id, t: Date.now() }, ...recent.filter((r) => r.id !== id)].slice(0, 8);
    store.set("recent", recent);
    visited[id] = Date.now();
    store.set("visited", visited);
    renderPaths();
  };

  /* guided paths ---------------------------------------------------------- */
  function renderPaths() {
    for (const path of $$("[data-path]")) {
      const steps = $$("[data-step]", path);
      const done = steps.filter((s) => visited[s.dataset.step]);
      const next = steps.find((s) => !visited[s.dataset.step]);
      for (const s of steps) {
        const on = !!visited[s.dataset.step];
        s.classList.toggle("is-done", on);
        s.classList.toggle("is-next", s === next);
        const st = $("[data-step-state]", s);
        if (st) st.textContent = on ? " (opened)" : s === next ? " (next)" : "";
      }
      path.classList.toggle("is-complete", !next);
      const prog = $("[data-path-progress]", path);
      if (!prog) continue;
      prog.textContent = "";
      if (!next) prog.append(el("span", { class: "path-done", text: "✓ Path complete" }));
      else {
        const p = byId[next.dataset.step];
        prog.append(
          el("span", { class: "path-count", text: `${done.length} of ${steps.length}` }),
          el("a", { class: "path-next", href: p.url, "data-track": p.id }, done.length ? "Next: " : "Start: ", p.title, el("span", { class: "arrow", "aria-hidden": "true", text: "→" })));
      }
    }
  }

  const shelf = $("[data-shelf]");
  const renderShelf = () => {
    for (const btn of $$("[data-pin]")) {
      const on = pins.includes(btn.dataset.pin);
      btn.setAttribute("aria-pressed", String(on));
      btn.title = on ? "Unpin" : "Pin to Continue";
    }
    if (!shelf) return;
    const list = $("[data-shelf-list]", shelf);
    list.textContent = "";
    const items = [
      ...pins.map((id) => ({ id, pinned: true })),
      ...recent.filter((r) => !pins.includes(r.id)).slice(0, 5).map((r) => ({ id: r.id, t: r.t })),
    ];
    for (const item of items) {
      const p = byId[item.id];
      list.append(el("li", { class: `shelf-item hue-${hueOf(p)}${item.pinned ? " is-pinned" : ""}` },
        el("a", { href: p.url, "data-track": p.id },
          glyphFor(p.id),
          el("span", { text: p.title }),
          el("span", { class: "shelf-meta", text: item.pinned ? "★ pinned" : ago(item.t) }))));
    }
    shelf.hidden = items.length === 0;
    const clear = $("[data-shelf-clear]", shelf);
    if (clear) clear.hidden = recent.length === 0;
  };
  const togglePin = (id) => {
    const on = pins.includes(id);
    pins = on ? pins.filter((x) => x !== id) : [...pins, id];
    store.set("pins", pins);
    renderShelf();
    toast(on ? "Unpinned" : "Pinned to Continue");
    return !on;
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-track]");
    if (a) track(a.dataset.track);
    const pin = e.target.closest("[data-pin]");
    if (pin) togglePin(pin.dataset.pin);
    const det = e.target.closest("[data-details]");
    if (det) openSheet(byId[det.dataset.details], det);
  });
  $("[data-shelf-clear]")?.addEventListener("click", () => {
    recent = [];
    store.set("recent", recent);
    visited = {};
    store.set("visited", visited);
    renderShelf();
    renderPaths();
    toast("History cleared");
  });
  renderShelf();
  renderPaths();

  /* ========================================================================
     search & filters
     ======================================================================== */
  const search = $("[data-search]");
  const bento = $("[data-bento]");
  const empty = $("[data-empty]");
  const filters = $$("[data-filter]");
  const toolbar = $("[data-toolbar]");
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const hay = Object.fromEntries(projects.map((p) => [p.id, norm([
    p.title, p.short, p.keywords, p.summary, p.type, p.note, sectionByType[p.type]?.title, sectionByType[p.type]?.one,
    (p.specimen || []).map((r) => r.join(" ")).join(" "), (p.sources || []).map((s) => s.text).join(" "),
  ].join(" "))]));
  let state = { type: "all", q: "" };

  // the hero lobule is a key to the colors: each vessel stands for one tool type
  const lobFig = $("[data-lobule]");
  const vessels = $$("[data-vessel]");
  const hueOfType = (t) => sectionByType[t]?.hue;
  const showVessel = (hue) => {
    if (!lobFig) return;
    const h = hue || (state.type !== "all" ? hueOfType(state.type) : null);
    if (h) lobFig.dataset.vessel = h; else delete lobFig.dataset.vessel;
  };
  const toTools = () => {
    const top = $("#tools").getBoundingClientRect().top + scrollY - headH();
    if (Math.abs(scrollY - top) > 4) scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  };
  const pickType = (type) => {
    state.type = state.type === type ? "all" : type;
    applyFilters();
    if (state.type !== "all") toTools();
  };
  for (const v of vessels) {
    const hue = v.dataset.hue;
    v.addEventListener("pointerenter", () => showVessel(hue));
    v.addEventListener("focus", () => showVessel(hue));
    v.addEventListener("pointerleave", () => showVessel(null));
    v.addEventListener("blur", () => showVessel(null));
    v.addEventListener("click", () => pickType(v.dataset.vessel));
  }

  const matches = (id, q) => !q || q.split(/\s+/).filter(Boolean).every((t) => hay[id].includes(t));

  const applyFilters = (animate = true) => {
    const q = norm(state.q.trim());
    const run = () => {
      let shown = 0;
      const counts = {};
      for (const plate of plates) {
        const id = plate.dataset.project;
        const hit = matches(id, q);
        if (hit) counts[plate.dataset.type] = (counts[plate.dataset.type] || 0) + 1;
        const visible = hit && (state.type === "all" || plate.dataset.type === state.type);
        plate.hidden = !visible;
        if (visible) shown++;
      }
      const filtering = state.type !== "all" || !!q;
      for (const g of $$("[data-group]", bento)) g.hidden = !$$("article.plate", g).some((p) => !p.hidden);
      const paths = $("[data-paths]");
      if (paths) paths.hidden = filtering;
      for (const v of vessels) v.setAttribute("aria-pressed", String(v.dataset.vessel === state.type));
      showVessel(null);
      for (const b of filters) {
        b.setAttribute("aria-pressed", String(b.dataset.filter === state.type));
        const c = $(".count", b);
        if (c) c.textContent = b.dataset.filter === "all" ? Object.values(counts).reduce((a, n) => a + n, 0) : (counts[b.dataset.filter] || 0);
      }
      if (empty) {
        empty.hidden = shown > 0;
        const qEl = $("[data-empty-q]", empty);
        if (qEl) qEl.textContent = state.q.trim() || decode(sectionByType[state.type]?.title || "");
        const sug = $("[data-empty-suggest]", empty);
        if (sug) sug.href = `mailto:${CFG.email}?subject=${encodeURIComponent("Tool idea: " + (state.q.trim() || "hepatology"))}`;
      }
    };
    animate ? transition(run) : run();

    const params = new URLSearchParams(location.search);
    state.q.trim() ? params.set("q", state.q.trim()) : params.delete("q");
    state.type !== "all" ? params.set("type", state.type) : params.delete("type");
    const qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  };

  if (search && bento) {
    const params = new URLSearchParams(location.search);
    const t = params.get("type");
    if (t && filters.some((b) => b.dataset.filter === t)) state.type = t;
    state.q = params.get("q") || "";
    search.value = state.q;
    if (state.q || state.type !== "all") applyFilters(false);

    let debounce;
    search.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { state.q = search.value; applyFilters(); }, 90);
    });
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = plates.find((p) => !p.hidden && !byId[p.dataset.project]?.soon);
        if (first) { e.preventDefault(); track(first.dataset.project); location.href = byId[first.dataset.project].url; }
      } else if (e.key === "Escape") {
        if (search.value) { e.preventDefault(); search.value = ""; state.q = ""; applyFilters(); }
        else search.blur();
      }
    });
    filters.forEach((b) => b.addEventListener("click", () => {
      state.type = b.dataset.filter === state.type && b.dataset.filter !== "all" ? "all" : b.dataset.filter;
      applyFilters();
    }));
    $("[data-clear-search]")?.addEventListener("click", () => {
      search.value = "";
      state = { type: "all", q: "" };
      applyFilters();
      search.focus();
    });
  }

  const focusSearch = () => {
    if (!search) { location.href = "/#tools"; return; }
    const top = $("#tools").getBoundingClientRect().top + scrollY - headH();
    if (scrollY < top - 4) scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    search.focus({ preventScroll: true });
  };
  $$("[data-focus-search]").forEach((b) => b.addEventListener("click", focusSearch));

  document.addEventListener("keydown", (e) => {
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); focusSearch(); }
    else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); focusSearch(); }
  });

  if (toolbar) {
    const onScroll = () => toolbar.classList.toggle("is-stuck", toolbar.getBoundingClientRect().top <= headH() + 1);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ========================================================================
     details sheet
     ======================================================================== */
  const sheet = $("#sheet");
  let sheetOpener = null;

  const citationFor = (p) => {
    const updated = parseDay($(`#p-${CSS.escape(p.id)}`)?.dataset.updated || p.updated);
    const parts = (CFG.author || "Mohammad Almeqdadi").split(" ");
    return `${parts[parts.length - 1]} ${parts[0][0]}. ${p.title} [web application].` +
      (updated ? ` Updated ${fmtMonth.format(updated)}.` : "") +
      ` Available at: ${p.url}. Accessed ${fmtLong.format(new Date())}.`;
  };
  const closeIcon = () => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 20 20");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = '<path d="M5 5l10 10M15 5L5 15"/>';
    return s;
  };

  function openSheet(p, opener) {
    if (!sheet || !p) return;
    sheetOpener = opener || null;
    const plate = $(`#p-${CSS.escape(p.id)}`);
    const sec = sectionByType[p.type] || {};
    const inner = $("[data-sheet]", sheet);
    sheet.className = `sheet hue-${hueOf(p)}`;
    inner.textContent = "";

    const art = plate ? $(".plate-art > .art, .plate-art > .glyph", plate)?.cloneNode(true) : null;
    const updated = parseDay(plate?.dataset.updated || p.updated);
    const added = parseDay(p.added);
    const log = (DATA.changelog || []).filter((e) => e.project === p.id);
    const pinned = () => pins.includes(p.id);

    const pinBtn = el("button", { class: "btn btn-ghost sm", type: "button", "aria-pressed": String(pinned()), text: pinned() ? "★ Pinned" : "☆ Pin" });
    pinBtn.addEventListener("click", () => {
      const on = togglePin(p.id);
      pinBtn.setAttribute("aria-pressed", String(on));
      pinBtn.textContent = on ? "★ Pinned" : "☆ Pin";
    });

    inner.append(
      el("div", { class: "sheet-art" },
        art,
        el("span", { class: "plate-type" }, el("span", { class: "dot", "aria-hidden": "true" }), decode(sec.one || p.type)),
        el("button", { class: "icon-btn sheet-close", type: "button", "aria-label": "Close", onclick: () => sheet.close() }, closeIcon())),
      el("div", { class: "sheet-body" },
        el("h2", { class: "sheet-title", id: "sheet-title", text: p.title }),
        el("p", { class: "sheet-summary", text: (p.summary || "").trim() }),
        el("a", { class: "btn btn-color", href: p.url, "data-track": p.id }, p.cta || sec.verb || "Open", el("span", { class: "arrow", "aria-hidden": "true", text: "→" })),
        plate && $(".io", plate) ? el("div", { class: "sheet-section" }, el("h3", { text: "At a glance" }), $(".io", plate).cloneNode(true)) : null,
        el("dl", { class: "sheet-facts" },
          el("div", {}, el("dt", { text: "Updated" }), el("dd", { text: updated ? fmtLong.format(updated) : "—" })),
          el("div", {}, el("dt", { text: "Listed since" }), el("dd", { text: added ? fmtMonth.format(added) : "—" }))),
        p.sources?.length ? el("div", { class: "sheet-section" }, el("h3", { text: "Sources" }),
          el("ul", {}, p.sources.map((s) => el("li", {}, s.url ? el("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.text }) : s.text)))) : null,
        p.note ? el("div", { class: "sheet-section" }, el("h3", { text: "Note" }), el("p", { text: p.note })) : null,
        log.length ? el("div", { class: "sheet-section" }, el("h3", { text: "History" }),
          el("ul", {}, log.map((e) => el("li", {}, el("time", { datetime: e.date, text: fmtDay.format(parseDay(e.date)) }), e.title)))) : null,
        el("div", { class: "sheet-section" }, el("h3", { text: "Share & teach" }),
          el("div", { class: "sheet-actions" },
            pinBtn,
            el("button", { class: "btn btn-ghost sm", type: "button", text: "Copy link", onclick: () => copy(p.url, "Link copied") }),
            el("button", { class: "btn btn-ghost sm", type: "button", text: "Present with QR", onclick: () => { sheet.close(); openPresent(p); } }),
            el("button", { class: "btn btn-ghost sm", type: "button", text: "Copy citation", onclick: () => copy(citationFor(p), "Citation copied") }),
            navigator.share ? el("button", { class: "btn btn-ghost sm", type: "button", text: "Share…", onclick: () => navigator.share({ title: p.title, url: p.url }).catch(() => {}) }) : null,
            p.repo ? el("a", { class: "btn btn-ghost sm", href: `https://github.com/${p.repo}/issues/new`, target: "_blank", rel: "noopener noreferrer", text: "Report an issue" }) : null))),
    );
    sheet.showModal();
    sheet.scrollTop = 0;
  }
  if (sheet) {
    sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });
    sheet.addEventListener("close", () => { sheetOpener?.focus?.(); sheetOpener = null; });
  }

  /* present --------------------------------------------------------------- */
  const present = $("#present");
  const QR_SRC = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
  async function openPresent(p) {
    if (!present) return;
    $("[data-present-kicker]", present).textContent = decode(sectionByType[p.type]?.one || "");
    $("[data-present-title]", present).textContent = p.title;
    $("[data-present-url]", present).textContent = p.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const qr = $("[data-present-qr]", present);
    qr.textContent = "";
    present.showModal();
    try {
      if (!window.qrcode) await loadScript(QR_SRC);
      const code = window.qrcode(0, "M");
      code.addData(p.url);
      code.make();
      qr.innerHTML = code.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) {
      qr.append(el("p", { class: "present-qr-fallback", text: "QR code unavailable offline. Share the address below." }));
    }
  }
  $("[data-present-close]")?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    present.close();
  });
  $("[data-present-full]")?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else present.requestFullscreen?.().catch(() => {});
  });

  $("[data-copy-cite]")?.addEventListener("click", () => {
    const text = $("[data-cite-text]")?.textContent.trim().replace(/\s+/g, " ");
    if (text) copy(`${text} Accessed ${fmtLong.format(new Date())}.`, "Citation copied");
  });

  /* flash a plate when you jump to it ------------------------------------- */
  const flash = (target) => {
    const plate = target?.closest?.(".plate");
    if (!plate) return;
    if (plate.hidden && search) { search.value = ""; state = { type: "all", q: "" }; applyFilters(false); }
    plate.classList.remove("is-flash");
    void plate.offsetWidth;
    plate.classList.add("is-flash");
    setTimeout(() => plate.classList.remove("is-flash"), 1500);
  };
  addEventListener("hashchange", () => flash(document.getElementById(location.hash.slice(1))));
  if (location.hash) flash(document.getElementById(location.hash.slice(1)));

  /* the lobule leans toward your pointer ---------------------------------- */
  const lobule = $("[data-lobule] .lobule-art");
  if (lobule && !reduceMotion && matchMedia("(hover: hover)").matches) {
    const hero = lobule.closest(".hero");
    let raf = 0;
    hero.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = lobule.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / r.width;
        const y = (e.clientY - (r.top + r.height / 2)) / r.height;
        lobule.style.setProperty("--rx", `${Math.max(-1, Math.min(1, x)) * 10}deg`);
        lobule.style.setProperty("--ry", `${Math.max(-1, Math.min(1, -y)) * 8}deg`);
      });
    });
    hero.addEventListener("pointerleave", () => {
      lobule.style.setProperty("--rx", "0deg");
      lobule.style.setProperty("--ry", "0deg");
    });
  }

  /* ========================================================================
     try it — one live control on a few plates, using each tool's own math
     ======================================================================== */
  const fmtN = (v, d = 0) => v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let tryUid = 0;

  const slider = ({ label, min, max, step, value, unit = "", show = (v) => fmtN(v) }) => {
    const id = `try-${++tryUid}`;
    const out = el("output", { class: "try-val", for: id });
    const input = el("input", { class: "try-range", id, type: "range", min, max, step, value });
    const sync = () => {
      out.textContent = show(+input.value) + unit;
      input.style.setProperty("--fill", `${((input.value - min) / (max - min)) * 100}%`);
    };
    input.addEventListener("input", sync);
    sync();
    return { input, node: el("div", { class: "try-control" }, el("label", { class: "try-label", for: id }, label, out), input) };
  };
  // a horizontal meter with an optional cutoff tick
  const meter = (label) => {
    const fill = el("span", { class: "meter-fill" });
    const tick = el("span", { class: "meter-tick", hidden: true });
    const val = el("span", { class: "meter-val" });
    const node = el("div", { class: "meter" },
      el("span", { class: "meter-label", text: label }), val,
      el("span", { class: "meter-track" }, fill, tick));
    return {
      node,
      set(frac, text, { cut = null, hot = false } = {}) {
        fill.style.width = `${clamp(frac, 0, 1) * 100}%`;
        val.textContent = text;
        node.classList.toggle("is-hot", hot);
        tick.hidden = cut == null;
        if (cut != null) tick.style.left = `${clamp(cut, 0, 1) * 100}%`;
      },
    };
  };

  const TRY = {
    // Portal Hypertension Predictor: the Vienna 3P logistic models (Reiniš et al., J Hepatol
    // 2023, Table S5), same coefficients as qaddodi/portal-hypertension-predictor.
    vienna(box) {
      const M10 = { i: -1.368246, plt: -0.009306, bili: 0.378559, inr: 2.556866, thr: 0.663008 };
      const M16 = { i: -2.015195, plt: -0.010163, bili: 0.116590, inr: 1.946251, thr: 0.332467 };
      const bili = 1.2, inr = 1.2;
      const p = (m, plt) => 1 / (1 + Math.exp(-(m.i + m.plt * plt + m.bili * bili + m.inr * inr)));
      const s = slider({ label: "Platelets", min: 40, max: 300, step: 5, value: 110, unit: " ×10⁹/L" });
      const a = meter("CSPH, HVPG ≥ 10");
      const b = meter("Severe, HVPG ≥ 16");
      const run = () => {
        const plt = +s.input.value;
        const p10 = p(M10, plt), p16 = p(M16, plt);
        a.set(p10, `${Math.round(p10 * 100)}%`, { cut: M10.thr, hot: p10 >= M10.thr });
        b.set(p16, `${Math.round(p16 * 100)}%`, { cut: M16.thr, hot: p16 >= M16.thr });
      };
      s.input.addEventListener("input", run);
      run();
      return [s.node, a.node, b.node, `Vienna 3P model, bilirubin ${bili} mg/dL and INR ${inr} held. Tick = the model’s cutoff.`];
    },

    // Liver Injury Backtracker: value then = value now × 2^(hours / half-life),
    // with the tool's default half-lives.
    backtrack(box) {
      const now = [["AST", 1800, 17], ["ALT", 1500, 72], ["LDH", 1200, 24]];
      const maxLog = 72 / 17;
      const s = slider({ label: "Look back", min: 0, max: 72, step: 6, value: 24, unit: " h", show: (v) => fmtN(v) });
      const rows = now.map(([name, , hl]) => [meter(`${name} · t½ ${hl} h`), name]);
      const run = () => {
        const h = +s.input.value;
        now.forEach(([, v, hl], i) => {
          const then = v * Math.pow(2, h / hl);
          rows[i][0].set((h / hl) / maxLog, `${fmtN(Math.round(then / 10) * 10)}`, { hot: h / hl >= 1 });
        });
      };
      s.input.addEventListener("input", run);
      run();
      return [s.node, ...rows.map((r) => r[0].node), "Drawn now: AST 1,800 · ALT 1,500 · LDH 1,200 U/L. AST clears fastest, so it climbs fastest going back."];
    },

    // Portal Pressure Simulator: read off a table sampled from the simulator's own engine
    // (_scripts/make-pressure-grid.mjs), interpolated between rows.
    pressure(box) {
      const g = DATA.pressureGrid;
      if (!g || !g.severity) return null;
      const at = (arr, s) => {
        const xs = g.severity;
        let i = xs.findIndex((x) => x >= s);
        if (i <= 0) return arr[Math.max(0, i)];
        const t = (s - xs[i - 1]) / (xs[i] - xs[i - 1]);
        return arr[i - 1] + t * (arr[i] - arr[i - 1]);
      };
      const stage = (s) => s < .15 ? "healthy" : s < .45 ? "mild" : s < .7 ? "moderate" : "advanced";
      const s = slider({ label: "Cirrhosis", min: 0, max: 95, step: 5, value: 60, show: (v) => stage(v / 100) });
      let tips = 0;
      const name = `tips-${++tryUid}`;
      const seg = el("div", { class: "try-seg", role: "radiogroup", "aria-label": "TIPS" },
        el("span", { class: "try-label", text: "TIPS" }),
        [0, 8, 10, 12].map((d) => el("label", {},
          el("input", { type: "radio", name, value: d, checked: d === 0 ? "" : null }),
          el("span", { text: d ? `${d} mm` : "None" }))));
      const pv = meter("Portal vein");
      const grad = meter("HVPG");
      const run = () => {
        const sv = +s.input.value / 100;
        const row = g[`tips_${tips}`];
        const p = at(row.pv, sv);
        const gr = tips ? at(row.ppg, sv) : at(row.hvpg, sv);
        pv.set(p / 25, `${fmtN(p, 1)} mmHg`);
        grad.node.querySelector(".meter-label").textContent = tips ? "Portosystemic gradient" : "HVPG";
        grad.set(gr / 25, `${fmtN(gr, 1)} mmHg`, { cut: (tips ? 12 : 10) / 25, hot: gr >= (tips ? 12 : 10) });
      };
      s.input.addEventListener("input", run);
      seg.addEventListener("change", (e) => { tips = +e.target.value; run(); });
      run();
      return [s.node, seg, pv.node, grad.node, "From the simulator’s own model. Tick: HVPG 10 (CSPH), or a gradient of 12 after TIPS. Illustrative physiology."];
    },
  };

  for (const box of $$("[data-try]")) {
    const make = TRY[box.dataset.try];
    const parts = make && make(box);
    if (!parts) continue;
    const note = typeof parts[parts.length - 1] === "string" ? parts.pop() : null;
    box.append(
      el("p", { class: "try-kicker" }, el("span", { class: "try-dot", "aria-hidden": "true" }), "Try it"),
      ...parts,
      note ? el("p", { class: "try-note", text: note }) : null);
    box.hidden = false;
  }

  /* ========================================================================
     glossary — dotted terms with a definition on hover, focus, or tap
     ======================================================================== */
  const gloss = (DATA.glossary || []).filter((g) => g.term && g.def).sort((a, b) => b.term.length - a.term.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const termRe = gloss.length ? new RegExp(`(?<![\\w-])(${gloss.map((g) => esc(g.term)).join("|")})(?![\\w-])`) : null;
  const defOf = Object.fromEntries(gloss.map((g) => [g.term, g.def]));
  const tip = el("div", { class: "term-tip", role: "tooltip", id: "term-tip", hidden: true });
  document.body.append(tip);
  let tipFor = null;

  const glossify = (root) => {
    if (!termRe || !root) return;
    const used = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (let node of nodes) {
      if (node.parentElement.closest(".term, a, button")) continue;
      let m;
      while (node && (m = termRe.exec(node.data))) {
        const term = m[1];
        if (used.has(term)) {
          // skip this one: search again after it
          const rest = node.splitText(m.index + term.length);
          node = rest;
          continue;
        }
        used.add(term);
        const hit = node.splitText(m.index);
        const rest = hit.splitText(term.length);
        const span = el("span", { class: "term", tabindex: "0", "data-term": term, text: term });
        hit.replaceWith(span);
        node = rest;
      }
    }
  };
  const showTip = (t) => {
    tipFor = t;
    tip.textContent = defOf[t.dataset.term] || "";
    tip.hidden = false;
    t.setAttribute("aria-describedby", "term-tip");
    const r = t.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8);
    const above = r.top - h - 10 > 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${above ? r.top - h - 10 : r.bottom + 10}px`;
  };
  const hideTip = () => {
    tipFor?.removeAttribute("aria-describedby");
    tipFor = null;
    tip.hidden = true;
  };
  document.addEventListener("pointerover", (e) => { const t = e.target.closest?.(".term"); if (t && e.pointerType === "mouse") showTip(t); });
  document.addEventListener("pointerout", (e) => { if (e.target.closest?.(".term") && e.pointerType === "mouse") hideTip(); });
  document.addEventListener("focusin", (e) => { const t = e.target.closest?.(".term"); if (t) showTip(t); });
  document.addEventListener("focusout", (e) => { if (e.target.closest?.(".term")) hideTip(); });
  document.addEventListener("click", (e) => {
    const t = e.target.closest?.(".term");
    if (t) { e.preventDefault(); if (e.pointerType !== "mouse") tipFor === t ? hideTip() : showTip(t); }
    else if (tipFor) hideTip();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tipFor) hideTip(); });
  addEventListener("scroll", () => tipFor && hideTip(), { passive: true });
  for (const n of $$(".plate-summary, .plate .io .chip")) glossify(n);
})();
