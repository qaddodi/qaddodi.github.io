/* ==========================================================================
   qaddodi.github.io — progressive enhancements
   Everything here is optional: the page is complete without JavaScript.
   Per-reader state (pins, recent, streak, last visit, theme) lives only in
   this browser's localStorage and never leaves it.
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

  const projects = DATA.projects || [];
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const sectionByType = Object.fromEntries((DATA.sections || []).map((s) => [s.type, s]));

  /* storage ---------------------------------------------------------------- */
  const store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem("qd:" + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("qd:" + key, JSON.stringify(value)); } catch (e) {}
    },
    del(key) {
      try { localStorage.removeItem("qd:" + key); } catch (e) {}
    },
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
  const listJoin = (arr) => {
    if (arr.length <= 1) return arr.join("");
    return arr.slice(0, -1).join(", ") + (arr.length > 2 ? "," : "") + " and " + arr[arr.length - 1];
  };

  /* small helpers ---------------------------------------------------------- */
  const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null) node.append(kid);
    return node;
  };
  const glyphFor = (id) => {
    const src = $(`#p-${CSS.escape(id)} .project-fig .glyph`);
    return src ? src.cloneNode(true) : null;
  };

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
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
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

  /* ========================================================================
     theme
     ======================================================================== */
  const themeBtn = $("[data-theme-toggle]");
  const themeLabel = { auto: "automatic", light: "light", dark: "dark" };
  const applyTheme = (mode) => {
    if (mode === "light" || mode === "dark") document.documentElement.dataset.theme = mode;
    else delete document.documentElement.dataset.theme;
    if (themeBtn) {
      themeBtn.setAttribute("aria-label", `Color theme: ${themeLabel[mode] || "automatic"}`);
      themeBtn.title = `Theme: ${themeLabel[mode] || "automatic"}`;
    }
  };
  let theme = store.get("theme", "auto");
  if (typeof theme !== "string") theme = "auto";
  applyTheme(theme);
  themeBtn?.addEventListener("click", () => {
    theme = theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
    if (theme === "auto") store.del("theme"); else store.set("theme", theme);
    applyTheme(theme);
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
  const freshAfter = returning ? startOfDay(prevVisit) + DAY : Infinity; // strictly after the last visit's day
  const isFresh = (day) => { const d = parseDay(day); return !!d && d.getTime() >= freshAfter; };

  const rows = $$("article.project");

  const renderBadges = () => {
    const freshProjects = [];
    for (const row of rows) {
      const id = row.dataset.project;
      const added = parseDay(row.dataset.added);
      const updated = parseDay(row.dataset.updated);
      const badges = $("[data-badges]", row);
      if (!badges) continue;
      badges.textContent = "";
      const isNew = added && now - added.getTime() < (CFG.newDays || 45) * DAY;
      const since = !isNew && isFresh(row.dataset.updated);
      const recent = !isNew && !since && updated && now - updated.getTime() < 30 * DAY;
      if (isNew) badges.append(el("span", { class: "badge badge--new", text: "New" }));
      if (since) {
        badges.append(el("span", { class: "badge badge--since", text: "Updated since your visit" }));
        freshProjects.push(id);
      }
      if (recent) badges.append(el("span", { class: "badge badge--updated", text: "Updated" }));

      const label = $("[data-updated-label]", row);
      if (label && updated) {
        label.dateTime = row.dataset.updated;
        label.textContent = fmtMonth.format(updated);
      }
      const dot = $(`[data-fig="${CSS.escape(id)}"] [data-fig-dot]`);
      if (dot) dot.hidden = !(isNew || since);
    }

    // banner above the index: what changed since the reader was last here
    const since = $("[data-since]");
    const addedSince = returning ? rows.filter((r) => isFresh(r.dataset.added)).map((r) => r.dataset.project) : [];
    if (since && (freshProjects.length || addedSince.length) && session.get("since-dismissed") !== "1") {
      const text = $("[data-since-text]", since);
      const links = (ids) => ids.flatMap((id, i) => [
        i ? (i === ids.length - 1 ? (ids.length > 2 ? ", and " : " and ") : ", ") : "",
        el("a", { href: `#p-${id}`, text: byId[id]?.title || id }),
      ]);
      text.textContent = "";
      text.append(`Since your last visit (${fmtDay.format(new Date(prevVisit))}): `);
      if (addedSince.length) text.append(...links(addedSince), addedSince.length > 1 ? " are new" : " is new");
      if (addedSince.length && freshProjects.length) text.append("; ");
      if (freshProjects.length) text.append(...links(freshProjects), freshProjects.length > 1 ? " were updated" : " was updated");
      text.append(".");
      since.hidden = false;
    }

    // changelog
    let freshLog = 0;
    for (const item of $$(".timeline-item")) {
      const fresh = isFresh(item.dataset.date);
      item.classList.toggle("is-fresh", fresh);
      const tag = $("[data-fresh]", item);
      if (tag) tag.hidden = !fresh;
      if (fresh) freshLog++;
    }
    const dot = $("[data-updates-dot]");
    if (dot) dot.hidden = !(freshLog || freshProjects.length);
  };

  $("[data-since-dismiss]")?.addEventListener("click", () => {
    $("[data-since]").hidden = true;
    session.set("since-dismissed", "1");
  });

  renderBadges();

  /* live freshness — read each repo's latest commit date from GitHub ----- */
  const FRESH_TTL = 12 * 3600 * 1000;
  const applyFreshness = (dates) => {
    let changed = false;
    for (const row of rows) {
      const d = dates[row.dataset.project];
      if (d && d > (row.dataset.updated || "")) {
        row.dataset.updated = d;
        changed = true;
      }
    }
    if (changed) renderBadges();
  };
  const refreshFreshness = async () => {
    const cached = store.get("fresh");
    if (cached && cached.t && now - cached.t < FRESH_TTL && cached.dates) {
      applyFreshness(cached.dates);
      return;
    }
    if (!("fetch" in window)) return;
    const dates = {};
    let blocked = false;
    await Promise.allSettled(projects.filter((p) => p.repo).map(async (p) => {
      if (blocked) return;
      const q = new URLSearchParams({ per_page: "1" });
      if (p.path) q.set("path", p.path);
      const res = await fetch(`https://api.github.com/repos/${p.repo}/commits?${q}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (res.status === 403 || res.status === 429) { blocked = true; return; }
      if (!res.ok) return;
      const json = await res.json();
      const iso = json?.[0]?.commit?.committer?.date || json?.[0]?.commit?.author?.date;
      if (iso) dates[p.id] = dateKey(new Date(iso));
    }));
    if (Object.keys(dates).length) {
      store.set("fresh", { t: now, dates });
      applyFreshness(dates);
    }
  };
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  if (rows.length) idle(() => refreshFreshness().catch(() => {}));

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

  const shelf = $("#shelf");
  const renderShelf = () => {
    for (const btn of $$("[data-pin]")) {
      const on = pins.includes(btn.dataset.pin);
      btn.setAttribute("aria-pressed", String(on));
      btn.title = on ? "Unpin from your shelf" : "Pin to your shelf";
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
      const li = el("li", { class: "shelf-item" + (item.pinned ? " is-pinned" : "") },
        el("a", { href: p.url, "data-track": p.id },
          glyphFor(p.id),
          el("span", { text: p.title }),
          el("span", { class: "shelf-meta", text: item.pinned ? "★ pinned" : ago(item.t) })));
      list.append(li);
    }
    shelf.hidden = items.length === 0;
    const clear = $("[data-shelf-clear]", shelf);
    if (clear) clear.hidden = recent.length === 0;
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-track]");
    if (a) track(a.dataset.track);

    const pin = e.target.closest("[data-pin]");
    if (pin) {
      const id = pin.dataset.pin;
      const on = pins.includes(id);
      pins = on ? pins.filter((x) => x !== id) : [...pins, id];
      store.set("pins", pins);
      renderShelf();
      toast(on ? "Removed from your shelf" : "Pinned to your shelf");
    }
  });
  $("[data-shelf-clear]")?.addEventListener("click", () => {
    recent = [];
    store.set("recent", recent);
    renderShelf();
    toast("History cleared");
  });
  renderShelf();

  /* ========================================================================
     share / present / cite
     ======================================================================== */
  const citationFor = (p) => {
    const updated = parseDay($(`#p-${CSS.escape(p.id)}`)?.dataset.updated || p.updated);
    const parts = (CFG.author || "Mohammad Almeqdadi").split(" ");
    const author = `${parts[parts.length - 1]} ${parts[0][0]}`;
    return `${author}. ${p.title} [web application].` +
      (updated ? ` Updated ${fmtMonth.format(updated)}.` : "") +
      ` Available at: ${p.url}. Accessed ${fmtLong.format(new Date())}.`;
  };

  let menu = null;
  let menuBtn = null;
  const closeMenu = (focusBack = false) => {
    if (!menu) return;
    menu.remove();
    menu = null;
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
      if (focusBack) menuBtn.focus();
    }
    menuBtn = null;
  };

  const openMenu = (btn) => {
    const p = byId[btn.dataset.share];
    if (!p) return;
    closeMenu();
    menuBtn = btn;
    const item = (label, hint, fn, href) => el("li", { role: "none" },
      href
        ? el("a", { class: "menu-item", role: "menuitem", href, target: "_blank", rel: "noopener noreferrer", onclick: () => closeMenu() }, label, hint ? el("small", { text: hint }) : null)
        : el("button", { class: "menu-item", role: "menuitem", type: "button", onclick: () => { closeMenu(); fn(); } }, label, hint ? el("small", { text: hint }) : null));

    const items = [
      item("Copy link", null, () => copy(p.url, "Link copied")),
      navigator.share ? item("Share…", null, () => navigator.share({ title: p.title, text: p.summary?.trim(), url: p.url }).catch(() => {})) : null,
      item("Present with QR code", "for a lecture", () => openPresent(p)),
      item("Copy citation", null, () => copy(citationFor(p), "Citation copied")),
      p.repo ? item("Report an issue", "GitHub", null, `https://github.com/${p.repo}/issues/new`) : null,
    ];
    menu = el("ul", { class: "menu", role: "menu", "aria-label": `Share ${p.title}` }, items);
    document.body.append(menu);
    btn.setAttribute("aria-expanded", "true");

    const r = btn.getBoundingClientRect();
    const w = menu.offsetWidth;
    const left = Math.max(8, Math.min(r.right - w, document.documentElement.clientWidth - w - 8));
    let top = r.bottom + 6;
    if (top + menu.offsetHeight > window.innerHeight - 8) top = r.top - menu.offsetHeight - 6;
    menu.style.left = `${left + window.scrollX}px`;
    menu.style.top = `${top + window.scrollY}px`;
    $(".menu-item", menu)?.focus();

    menu.addEventListener("keydown", (e) => {
      const opts = $$(".menu-item", menu);
      const i = opts.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
      else if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
      else if (e.key === "Tab") closeMenu();
    });
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-share]");
    if (btn) {
      if (menuBtn === btn) closeMenu();
      else openMenu(btn);
      return;
    }
    if (menu && !menu.contains(e.target)) closeMenu();
  });
  window.addEventListener("resize", () => closeMenu());

  /* present --------------------------------------------------------------- */
  const present = $("#present");
  const QR_SRC = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
  const openPresent = async (p) => {
    if (!present) return;
    const kicker = $("[data-present-kicker]", present);
    const title = $("[data-present-title]", present);
    const url = $("[data-present-url]", present);
    const qr = $("[data-present-qr]", present);
    kicker.textContent = sectionByType[p.type]?.title?.replace(/&amp;/g, "&") || "";
    title.textContent = p.title;
    url.textContent = p.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    qr.textContent = "";
    if (typeof present.showModal === "function") present.showModal(); else present.setAttribute("open", "");
    try {
      if (!window.qrcode) await loadScript(QR_SRC);
      const code = window.qrcode(0, "M");
      code.addData(p.url);
      code.make();
      qr.innerHTML = code.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) {
      qr.append(el("p", { class: "present-qr-fallback", text: "QR code unavailable offline. Share the address below." }));
    }
  };
  $("[data-present-close]")?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    present.close();
  });
  $("[data-present-full]")?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else present.requestFullscreen?.().catch(() => {});
  });

  /* site citation --------------------------------------------------------- */
  $("[data-copy-cite]")?.addEventListener("click", () => {
    const text = $("[data-cite-text]")?.textContent.trim().replace(/\s+/g, " ");
    if (text) copy(`${text} Accessed ${fmtLong.format(new Date())}.`, "Citation copied");
  });

  /* ========================================================================
     search palette
     ======================================================================== */
  const palette = $("#palette");
  const input = palette ? $(".palette-input", palette) : null;
  const listEl = palette ? $(".palette-list", palette) : null;
  let results = [];
  let active = 0;

  const go = (href, newTab) => {
    if (newTab) window.open(href, "_blank", "noopener");
    else location.href = href;
  };
  const scrollToId = (id) => {
    palette?.close();
    const target = document.getElementById(id);
    if (!target) { location.href = `/#${id}`; return; }
    history.pushState(null, "", `#${id}`);
    target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    flash(target);
  };

  const actions = [
    { title: "Today’s panel", sub: "One lab panel a day. Name the pattern.", tag: "daily", keywords: "quiz daily puzzle streak lft labs", run: () => scrollToId("today") },
    { title: "What’s new", sub: "Recent tools and updates", tag: "updates", keywords: "changelog updates news recent", run: () => scrollToId("updates") },
    { title: "Subscribe via RSS", sub: "Get new tools in your feed reader", tag: "feed", keywords: "rss atom feed subscribe follow", run: () => go("/feed.xml") },
    { title: "Suggest a tool or case", sub: CFG.email, tag: "email", keywords: "idea feedback contact email suggest fix", run: () => go(`mailto:${CFG.email}?subject=Idea%20for%20a%20hepatology%20tool`) },
    { title: "Switch color theme", sub: "Automatic, light, or dark", tag: "theme", keywords: "dark light mode theme", run: () => { palette.close(); themeBtn?.click(); } },
    { title: "Surprise me", sub: "Jump to a random tool", tag: "random", keywords: "random surprise explore", run: () => {
      const p = projects[Math.floor(Math.random() * projects.length)];
      scrollToId(`p-${p.id}`);
    } },
  ];

  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const projectItems = projects.map((p) => ({
    project: p,
    title: p.title,
    sub: (p.summary || "").trim(),
    tag: (sectionByType[p.type]?.title || p.type).replace(/&amp;/g, "&"),
    hay: norm([p.title, p.short, p.keywords, p.summary, p.type, sectionByType[p.type]?.title, (p.specimen || []).map((r) => r[1]).join(" ")].join(" ")),
    run: (newTab) => { track(p.id); go(p.url, newTab); },
  }));
  const actionItems = actions.map((a) => ({ ...a, hay: norm([a.title, a.sub, a.keywords].join(" ")) }));

  const score = (item, terms) => {
    let total = 0;
    const title = norm(item.title);
    for (const t of terms) {
      if (!item.hay.includes(t)) return -1;
      if (title.startsWith(t)) total += 100;
      else if (title.includes(" " + t)) total += 60;
      else if (title.includes(t)) total += 40;
      else if (new RegExp("\\b" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(item.hay)) total += 20;
      else total += 5;
    }
    return total;
  };

  const renderPalette = () => {
    const q = norm(input.value.trim());
    const terms = q.split(/\s+/).filter(Boolean);
    let groups;
    if (!terms.length) {
      groups = [["Tools", projectItems], ["Go to", actionItems]];
    } else {
      const rank = (arr) => arr.map((i) => [i, score(i, terms)]).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]).map(([i]) => i);
      groups = [["Tools", rank(projectItems)], ["Go to", rank(actionItems)]];
    }
    results = [];
    listEl.textContent = "";
    for (const [label, items] of groups) {
      if (!items.length) continue;
      listEl.append(el("li", { class: "palette-group", role: "presentation", text: label }));
      for (const item of items) {
        const i = results.length;
        results.push(item);
        const li = el("li", {
          class: "palette-item",
          id: `pal-${i}`,
          role: "option",
          "aria-selected": "false",
          onclick: (e) => item.run(e.metaKey || e.ctrlKey),
          onmousemove: () => setActive(i, false),
        },
        item.project ? glyphFor(item.project.id) : el("span", { "aria-hidden": "true" }),
        el("span", {}, el("span", { class: "palette-item-title", text: item.title }), el("span", { class: "palette-item-sub", text: item.sub })),
        el("span", { class: "palette-item-tag", text: item.tag }));
        listEl.append(li);
      }
    }
    if (!results.length) {
      listEl.append(el("li", { class: "palette-empty", role: "presentation" },
        "Nothing matches. ", el("a", { href: `mailto:${CFG.email}?subject=${encodeURIComponent("Tool idea: " + input.value.trim())}`, text: "Suggest it?" })));
    }
    setActive(0, false);
  };

  const setActive = (i, scroll = true) => {
    if (!results.length) { input.removeAttribute("aria-activedescendant"); return; }
    active = (i + results.length) % results.length;
    $$(".palette-item", listEl).forEach((li) => li.setAttribute("aria-selected", String(li.id === `pal-${active}`)));
    input.setAttribute("aria-activedescendant", `pal-${active}`);
    if (scroll) document.getElementById(`pal-${active}`)?.scrollIntoView({ block: "nearest" });
  };

  const openPalette = () => {
    if (!palette || palette.open) return;
    closeMenu();
    input.value = "";
    renderPalette();
    palette.showModal();
    input.focus();
  };

  if (palette) {
    input.addEventListener("input", renderPalette);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        results[active]?.run(e.metaKey || e.ctrlKey);
      } else if (e.key === "Escape") {
        // a search input clears itself on Escape; close the palette instead
        e.preventDefault();
        palette.close();
      }
    });
    palette.addEventListener("click", (e) => { if (e.target === palette) palette.close(); });
    $$("[data-open-palette]").forEach((b) => b.addEventListener("click", openPalette));
  }

  document.addEventListener("keydown", (e) => {
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openPalette(); }
    else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); openPalette(); }
    else if (e.key === "Escape" && menu) closeMenu(true);
  });

  /* flash a row when you jump to it --------------------------------------- */
  const flash = (target) => {
    const row = target?.closest?.(".project") || (target?.classList?.contains("legacy-anchor") ? target.parentElement : null);
    if (!row) return;
    row.classList.remove("is-flash");
    void row.offsetWidth;
    row.classList.add("is-flash");
    setTimeout(() => row.classList.remove("is-flash"), 1700);
  };
  window.addEventListener("hashchange", () => flash(document.getElementById(location.hash.slice(1))));
  if (location.hash) flash(document.getElementById(location.hash.slice(1)));

  /* first visit this session: draw the figure strip ----------------------- */
  if (session.get("drawn") !== "1" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    session.set("drawn", "1");
    $$(".figstrip .glyph").forEach((g, i) => {
      setTimeout(() => {
        g.classList.add("is-drawing");
        setTimeout(() => g.classList.remove("is-drawing"), 1700);
      }, 250 + i * 110);
    });
  }

  /* ========================================================================
     today's panel
     ======================================================================== */
  const today = $("#today");
  const panels = DATA.panels || [];
  if (today && panels.length) initPanel();

  function rng(seed) {
    // mulberry32
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
    // Every cycle of n days shows every case exactly once, in a new order.
    const cycle = Math.floor(dayNo / n);
    const order = shuffled([...Array(n).keys()], rng(9173 + cycle * 101));
    const todayIdx = order[dayNo % n];
    const deck = byId["liver-panel"];

    const hist = () => {
      const h = store.get("panel", {});
      return h && typeof h === "object" ? h : {};
    };

    const streakInfo = () => {
      const h = hist();
      let streak = 0;
      const d = parseDay(todayKey);
      if (!h[todayKey]) d.setDate(d.getDate() - 1); // today not played yet: count up to yesterday
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
      node.title = `Streak: ${s.streak} day${s.streak === 1 ? "" : "s"} in a row. ${s.right} of ${s.played} named on the first try.`;
    };

    const nextIn = () => {
      const t = new Date(); t.setHours(24, 0, 0, 0);
      const mins = Math.max(1, Math.round((t - Date.now()) / 60000));
      const h = Math.floor(mins / 60), m = mins % 60;
      return h ? `${h} h ${m} min` : `${m} min`;
    };

    const render = (idx, practice = false) => {
      const panel = panels[idx];
      const body = $("[data-panel-body]", today);
      const clue = $("[data-panel-clue]", today);
      const noEl = $("[data-panel-no]", today);
      noEl.textContent = practice ? "· practice" : `· No. ${dayNo + 1}`;
      clue.textContent = panel.clue;

      const rand = rng((practice ? 7919 + idx * 31 + Date.now() % 1000 : 1543 + dayNo * 7) >>> 0);
      const others = shuffled(panels.map((p) => p.answer).filter((a) => a !== panel.answer), rand);
      const options = shuffled([panel.answer, ...[...new Set(others)].slice(0, 3)], rand);

      const labs = el("dl", { class: "labs", "aria-label": "Lab panel" },
        panel.labs.map(([name, value, unit, tell]) =>
          el("div", { class: "lab" + (tell ? " is-tell" : "") },
            el("dt", {}, name, unit ? el("span", { class: "lab-unit", text: unit }) : null),
            el("dd", { text: value }))));

      const choices = el("ul", { class: "choices", "aria-label": "Choose the pattern" },
        options.map((opt) => el("li", {}, el("button", { class: "choice", type: "button", "data-choice": opt, text: opt }))));

      const reveal = el("div", { class: "reveal", "aria-live": "polite", hidden: true });
      body.textContent = "";
      body.append(labs, choices, reveal);
      today.classList.remove("is-revealed");

      const finish = (picked, record) => {
        const correct = picked === panel.answer;
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
          // keep the last year only
          const keys = Object.keys(h).sort();
          while (keys.length > 366) delete h[keys.shift()];
          store.set("panel", h);
          renderStreak();
        }
        const s = streakInfo();
        reveal.hidden = false;
        reveal.textContent = "";
        reveal.append(
          el("p", { class: "reveal-verdict " + (correct ? "is-right" : "is-wrong"), text: correct ? "Correct" : `Not quite${picked ? ` (you chose ${picked})` : ""}` }),
          el("p", { class: "reveal-answer", text: panel.answer }),
          el("p", { class: "reveal-teach", text: panel.teach }),
          el("div", { class: "reveal-actions" },
            deck ? el("a", { class: "reveal-link", href: deck.url, "data-track": deck.id, text: `Case ${panel.case} in the full deck →` }) : null,
            !practice ? el("button", {
              class: "reveal-share", type: "button", text: "Share result",
              onclick: () => {
                const text = `Liver panel No. ${dayNo + 1}: ${correct ? "named it ✓" : "missed it ✗"}${s.streak > 1 ? ` · ${s.streak}-day streak` : ""}\n${CFG.url}/#today`;
                if (navigator.share) navigator.share({ text }).catch(() => {});
                else copy(text, "Result copied");
              },
            }) : null,
            el("button", {
              class: "reveal-share", type: "button", text: practice ? "Another practice case" : "Practice another",
              onclick: () => {
                let i = Math.floor(Math.random() * n);
                if (n > 1) while (i === idx || i === todayIdx) i = Math.floor(Math.random() * n);
                render(i, true);
              },
            })),
          practice
            ? el("p", { class: "reveal-next" }, "Practice cases don’t count toward your streak. ", el("button", { class: "reveal-share", type: "button", text: "Back to today’s", onclick: () => render(todayIdx) }))
            : el("p", { class: "reveal-next", text: `Next panel in ${nextIn()}. Come back tomorrow to keep your streak.` }));
      };

      choices.addEventListener("click", (e) => {
        const b = e.target.closest("[data-choice]");
        if (!b || b.disabled) return;
        finish(b.dataset.choice, !practice);
      });

      if (!practice) {
        const done = hist()[todayKey];
        if (done) finish(done.a || (done.c ? panel.answer : null), false);
      }
    };

    renderStreak();
    render(todayIdx);
  }
})();
