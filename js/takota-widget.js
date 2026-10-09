/* Small adapter: page and widget use the same shared Takota engine and browser UI. */
(() => {
  "use strict";
  async function loadScript(path, globalName) {
    if (window[globalName]) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = path;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }
  async function init() {
    if (
      document.querySelector("[data-takota-root]") ||
      document.getElementById("takota-widget-btn")
    )
      return;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/css/takota-chat.css";
    document.head.append(css);
    const style = document.createElement("style");
    style.textContent = `#takota-widget-btn{position:fixed;bottom:20px;right:20px;z-index:10001;min-height:48px;padding:12px 16px;background:#c9a84c;color:#0d1538;border:2px solid #c9a84c;border-radius:24px;font:700 1rem system-ui;cursor:pointer}#takota-widget-panel{position:fixed;right:12px;bottom:84px;width:min(420px,calc(100vw - 24px));max-height:calc(100dvh - 100px);overflow-y:auto;z-index:10002;background:#0d1538;color:#e8eaf0;border:1px solid #606c98;border-radius:16px;padding:12px;box-shadow:0 8px 30px #0008}#takota-widget-panel[hidden]{display:none}#takota-widget-panel>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;font:1rem system-ui}#takota-widget-close{min-width:44px;min-height:44px;border:1px solid #606c98;background:#141b3d;color:#e8eaf0;border-radius:8px;cursor:pointer}#takota-widget-btn:focus-visible,#takota-widget-close:focus-visible{outline:3px solid #e8eaf0;outline-offset:3px}`;
    document.head.append(style);
    const button = document.createElement("button");
    button.id = "takota-widget-btn";
    button.type = "button";
    button.textContent = "Takota";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "takota-widget-panel");
    button.setAttribute("aria-label", "Open Takota support");
    const panel = document.createElement("section");
    panel.id = "takota-widget-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Takota support");
    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = "Takota";
    const link = document.createElement("a");
    link.href = "/takota.html";
    link.textContent = "Open full page";
    link.style.color = "#dac274";
    const close = document.createElement("button");
    close.id = "takota-widget-close";
    close.type = "button";
    close.textContent = "Close";
    header.append(title, link, close);
    const root = document.createElement("div");
    panel.append(header, root);
    document.body.append(button, panel);
    let chat;
    function hide() {
      chat?.pause();
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.focus();
    }
    close.addEventListener("click", hide);
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.querySelector("dialog[open]"))
        hide();
    });
    button.addEventListener("click", async () => {
      if (!panel.hidden) {
        hide();
        return;
      }
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      close.focus();
      if (chat) return;
      root.textContent = "Loading local guidance…";
      try {
        await loadScript("/js/takota-core.js", "DivergifyTakotaCore");
        await loadScript("/js/takota-chat.js", "DivergifyTakotaChat");
        chat = window.DivergifyTakotaChat.mount(root);
      } catch {
        root.textContent =
          "Takota could not load. Open the full page or reload to try again.";
      }
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else void init();
})();
