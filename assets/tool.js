/* Shared behavior for the standalone tools: the light / dark / automatic theme
   toggle. The choice is stored under the same key as the homepage ("qd:theme"),
   and every tool lives on the same origin, so one choice follows you everywhere.
   Each tool also carries a tiny inline script that applies the saved theme
   before first paint (see the tool's <head>). */
(() => {
  const KEY = "qd:theme";
  const root = document.documentElement;
  root.classList.add("qd-js");
  const label = { auto: "automatic", light: "light", dark: "dark" };
  const read = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY)); return v === "light" || v === "dark" ? v : "auto"; } catch (e) { return "auto"; }
  };
  const apply = (mode) => {
    if (mode === "auto") delete root.dataset.theme; else root.dataset.theme = mode;
    for (const b of document.querySelectorAll("[data-qd-theme]")) {
      b.dataset.mode = mode;
      b.setAttribute("aria-label", `Color theme: ${label[mode]}`);
      b.title = `Theme: ${label[mode]}`;
    }
  };
  let mode = read();
  apply(mode);
  document.addEventListener("click", (e) => {
    if (!e.target.closest?.("[data-qd-theme]")) return;
    mode = { auto: "light", light: "dark", dark: "auto" }[mode];
    try { localStorage.setItem(KEY, JSON.stringify(mode)); } catch (err) {}
    apply(mode);
  });
})();
