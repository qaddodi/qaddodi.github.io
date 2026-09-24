/* ==========================================================================
   qaddodi.github.io — progressive enhancements
   The page is complete without JavaScript. Everything a reader does here
   (pins, recent, streak, last visit, theme) stays in this browser's
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
  const session = {
    get(key) { try { return sessionStorage.getItem("qd:" + key); } catch (e) { return null; } },
    set(key, value) { try { sessionStorage.setItem("qd:" + key, value); } catch (e) {} },
  };

  /* dates ------------------------------------------------------------------ */
  const pad2 = (n) => String(n).padStart(2, "0");
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const parseDay = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
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

  /* ========================================================================
     visits — "since your last visit"
     ======================================================================== */
  const now = Date.now();
  let prevVisit = session.get("prev");
  if (prevVisit == null) {
    prevVisit = Number(store.get("lastVisit", 0)) || 0;
    session.set("prev", String(prevVisit));
    store.set("lastVisit", now);
  } else {
    prevVisit = Number(prevVisit) || 0;
  }
  const returning = prevVisit > 0;
  const freshAfter = returning ? startOfDay(prevVisit) + DAY : Infinity;
  const isFresh = (day) => { const d = parseDay(day); return !!d && d.getTime() >= freshAfter; };

  const plates = $$("article.plate");

  const renderBadges = () => {
    const updatedSince = [];
    const addedSince = [];
    for (const plate of plates) {
      const id = plate.dataset.project;
      const added = parseDay(plate.dataset.added);
      const updated = parseDay(plate.dataset.updated);
      const badges = $("[data-badges]", plate);
      badges.textContent = "";
      const isNew = added && now - added.getTime() < (CFG.newDays || 45) * DAY;
      const since = !isNew && isFresh(plate.dataset.updated);
      const recent = !isNew && !since && updated && now - updated.getTime() < 30 * DAY;
      if (isNew) badges.append(el("span", { class: "badge badge--new", text: "New" }));
      if (since) badges.append(el("span", { class: "badge badge--since", text: "Updated since your visit" }));
      if (recent) badges.append(el("span", { class: "badge badge--updated", text: "Updated" }));
      if (since) updatedSince.push(id);
      if (returning && isFresh(plate.dataset.added)) addedSince.push(id);

      const label = $("[data-updated-label]", plate);
      if (label && updated) {
        label.dateTime = plate.dataset.updated;
        label.textContent = fmtMonth.format(updated);
      }
    }

    const since = $("[data-since]");
    if (since && (updatedSince.length || addedSince.length) && session.get("since-dismissed") !== "1") {
      const text = $("[data-since-text]", since);
      const links = (ids) => ids.flatMap((id, i) => [
        i ? (i === ids.length - 1 ? (ids.length > 2 ? ", and " : " and ") : ", ") : "",
        el("a", { href: `#p-${id}`, text: byId[id]?.title || id }),
      ]);
      text.textContent = "";
      text.append(`Since your last visit (${fmtDay.format(new Date(prevVisit))}): `);
      if (addedSince.length) text.append(...links(addedSince), addedSince.length > 1 ? " are new" : " is new");
      if (addedSince.length && updatedSince.length) text.append("; ");
      if (updatedSince.length) text.append(...links(updatedSince), updatedSince.length > 1 ? " were updated" : " was updated");
      text.append(".");
      since.hidden = false;
    }

    let freshLog = 0;
    for (const item of $$(".news-item")) {
      const fresh = isFresh(item.dataset.date);
      item.classList.toggle("is-fresh", fresh);
      const tag = $("[data-fresh]", item);
      if (tag) tag.hidden = !fresh;
      if (fresh) freshLog++;
    }
    const dot = $("[data-updates-dot]");
    if (dot) dot.hidden = !(freshLog || updatedSince.length || addedSince.length);
  };

  $("[data-since-dismiss]")?.addEventListener("click", () => {
    $("[data-since]").hidden = true;
    session.set("since-dismissed", "1");
  });
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
  pins = pins.filter((id) => byId[id]);
  recent = recent.filter((r) => r && byId[r.id]);

  const track = (id) => {
    if (!byId[id]) return;
    recent = [{ id, t: Date.now() }, ...recent.filter((r) => r.id !== id)].slice(0, 8);
    store.set("recent", recent);
  };

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
    renderShelf();
    toast("History cleared");
  });
  renderShelf();

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
      for (const s of $$("[data-special]", bento)) s.hidden = filtering;
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
        const first = plates.find((p) => !p.hidden);
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
     today's panel
     ======================================================================== */
  const today = $("#today");
  const panels = DATA.panels || [];
  if (today && panels.length) initPanel();

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function initPanel() {
    const n = panels.length;
    const epoch = parseDay(CFG.panelEpoch) || new Date(2026, 8, 24);
    const todayKey = dateKey();
    const dayNo = Math.max(0, Math.round((parseDay(todayKey) - epoch) / DAY));
    // each run of n days shows every case once, in a new order
    const cycle = Math.floor(dayNo / n);
    const order = shuffled([...Array(n).keys()], rng(9173 + cycle * 101));
    const todayIdx = order[dayNo % n];
    const deck = byId["liver-panel"];
    const labsBox = $("[data-panel-labs]", today);
    const right = $("[data-panel-right]", today);
    let active = null;

    const hist = () => { const h = store.get("panel", {}); return h && typeof h === "object" ? h : {}; };
    const streakInfo = () => {
      const h = hist();
      let streak = 0;
      const d = parseDay(todayKey);
      if (!h[todayKey]) d.setDate(d.getDate() - 1);
      while (h[dateKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
      const played = Object.values(h);
      return { streak, played: played.length, right: played.filter((x) => x && x.c).length };
    };
    const renderStreak = () => {
      const s = streakInfo();
      const node = $("[data-panel-streak]", today);
      if (!s.played) { node.hidden = true; return; }
      node.hidden = false;
      node.textContent = `${s.streak > 1 ? `${s.streak}-day streak · ` : ""}${s.right} of ${s.played} named`;
    };
    const nextIn = () => {
      const t = new Date(); t.setHours(24, 0, 0, 0);
      const mins = Math.max(1, Math.round((t - Date.now()) / 60000));
      const h = Math.floor(mins / 60), m = mins % 60;
      return h ? `${h} h ${m} min` : `${m} min`;
    };

    const render = (idx, practice = false) => {
      const panel = panels[idx];
      $("[data-panel-no]", today).textContent = practice ? "· practice" : `· No. ${dayNo + 1}`;
      $("[data-panel-clue]", today).textContent = panel.clue;
      today.classList.remove("is-revealed");

      const rand = rng((practice ? 7919 + idx * 31 + (Date.now() % 997) : 1543 + dayNo * 7) >>> 0);
      const others = [...new Set(panels.map((p) => p.answer).filter((a) => a !== panel.answer))];
      const options = shuffled([panel.answer, ...shuffled(others, rand).slice(0, 3)], rand);

      labsBox.textContent = "";
      labsBox.append(el("dl", { class: "labs", "aria-label": "Lab panel" },
        panel.labs.map(([name, value, unit, tell]) =>
          el("div", { class: "lab" + (tell ? " is-tell" : "") },
            el("dt", {}, name, unit ? el("span", { class: "lab-unit", text: unit }) : null),
            el("dd", { text: value })))));

      const choices = el("ul", { class: "choices" },
        options.map((opt, i) => el("li", {},
          el("button", { class: "choice", type: "button", "data-choice": opt, "aria-keyshortcuts": String(i + 1) },
            el("span", { class: "choice-key", "aria-hidden": "true", text: String(i + 1) }), opt))));
      const label = el("p", { class: "choices-label", text: "What’s the pattern?" });
      const reveal = el("div", { class: "reveal", "aria-live": "polite", hidden: true });
      right.textContent = "";
      right.append(label, choices, reveal);

      const finish = (picked, record) => {
        const correct = picked === panel.answer;
        active = null;
        today.classList.add("is-revealed");
        choices.classList.add("is-done");
        for (const b of $$(".choice", choices)) {
          b.disabled = true;
          if (b.dataset.choice === panel.answer) b.classList.add("is-right");
          else if (b.dataset.choice === picked) b.classList.add("is-wrong");
        }
        if (record) {
          const h = hist();
          h[todayKey] = { c: correct, a: picked, n: dayNo + 1 };
          const keys = Object.keys(h).sort();
          while (keys.length > 366) delete h[keys.shift()];
          store.set("panel", h);
          renderStreak();
        }
        const s = streakInfo();
        label.hidden = true;
        reveal.hidden = false;
        reveal.textContent = "";
        reveal.append(
          el("p", { class: "verdict " + (correct ? "is-right" : "is-wrong"), text: correct ? "✓ Correct" : `✗ Not quite${picked ? ` (you chose ${picked})` : ""}` }),
          el("p", { class: "answer", text: panel.answer }),
          el("p", { class: "teach", text: panel.teach }),
          el("div", { class: "reveal-actions" },
            deck ? el("a", { class: "pill-btn primary", href: deck.url, "data-track": deck.id }, `Case ${panel.case} in the deck`, el("span", { "aria-hidden": "true", text: "→" })) : null,
            !practice ? el("button", {
              class: "pill-btn", type: "button", text: "Share result",
              onclick: () => {
                const text = `Liver panel No. ${dayNo + 1}: ${correct ? "named it ✓" : "missed it ✗"}${s.streak > 1 ? ` · ${s.streak}-day streak` : ""}\n${CFG.url}/#today`;
                if (navigator.share) navigator.share({ text }).catch(() => {}); else copy(text, "Result copied");
              },
            }) : null,
            el("button", {
              class: "pill-btn", type: "button", text: practice ? "Another" : "Practice another",
              onclick: () => {
                let i = Math.floor(Math.random() * n);
                if (n > 2) while (i === idx || i === todayIdx) i = Math.floor(Math.random() * n);
                render(i, true);
              },
            })),
          practice
            ? el("p", { class: "next" }, "Practice doesn’t count toward your streak. ", el("button", { class: "text-btn", type: "button", text: "Back to today’s", onclick: () => render(todayIdx) }))
            : el("p", { class: "next", text: `Next panel in ${nextIn()}. Come back tomorrow to keep your streak.` }));
      };

      choices.addEventListener("click", (e) => {
        const b = e.target.closest("[data-choice]");
        if (b && !b.disabled) finish(b.dataset.choice, !practice);
      });
      active = { pick: (i) => { const b = $$(".choice", choices)[i]; if (b && !b.disabled) finish(b.dataset.choice, !practice); } };

      if (!practice) {
        const done = hist()[todayKey];
        if (done) finish(done.a || (done.c ? panel.answer : null), false);
      }
    };

    // keys 1–4 answer while the panel is on screen
    let onScreen = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }, { threshold: .5 }).observe(today);
    }
    document.addEventListener("keydown", (e) => {
      if (!active || !onScreen || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable], dialog")) return;
      const i = "1234".indexOf(e.key);
      if (i >= 0) { e.preventDefault(); active.pick(i); }
    });

    renderStreak();
    render(todayIdx);
  }
})();
