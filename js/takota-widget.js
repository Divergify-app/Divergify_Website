/**
 * Takota Widget — Divergify
 * Embeddable AI companion chat widget for the divergify.app website.
 *
 * Usage: Add this script tag to any page:
 *   <script src="/js/takota-widget.js" defer></script>
 *
 * The widget will auto-inject a floating chat button and panel.
 * It calls the Divergify server's tRPC widgetChat endpoint.
 */
(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  const API_BASE = 'https://api.divergify.app';
  const WIDGET_VERSION = '1.0.0';
  const STORAGE_KEY = 'takota_widget_history';
  const MAX_HISTORY = 10; // keep last 5 exchanges

  // ── State ──────────────────────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  let history = [];

  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) history = JSON.parse(saved);
  } catch (_) {}

  // ── Styles ─────────────────────────────────────────────────────────────────
  const STYLES = `
    #takota-widget-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #C9A84C;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      font-size: 22px;
    }
    #takota-widget-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(0,0,0,0.45);
    }
    #takota-widget-btn:active {
      transform: scale(0.96);
    }
    #takota-widget-panel {
      position: fixed;
      bottom: 96px;
      right: 28px;
      width: 340px;
      max-height: 520px;
      background: #0D1538;
      border: 1px solid #252D54;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      z-index: 9999;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform: translateY(12px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    #takota-widget-panel.open {
      transform: translateY(0);
      opacity: 1;
      pointer-events: all;
    }
    #takota-widget-header {
      padding: 16px 18px 12px;
      border-bottom: 1px solid #252D54;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #takota-widget-header .tw-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #141B3D;
      border: 1px solid #C9A84C;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    #takota-widget-header .tw-name {
      font-size: 14px;
      font-weight: 700;
      color: #E8EAF0;
      line-height: 1.2;
    }
    #takota-widget-header .tw-status {
      font-size: 11px;
      color: #6B7294;
    }
    #takota-widget-header .tw-close {
      margin-left: auto;
      background: none;
      border: none;
      color: #6B7294;
      cursor: pointer;
      font-size: 18px;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
    }
    #takota-widget-header .tw-close:hover { color: #E8EAF0; }
    #takota-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    #takota-widget-messages::-webkit-scrollbar { width: 4px; }
    #takota-widget-messages::-webkit-scrollbar-track { background: transparent; }
    #takota-widget-messages::-webkit-scrollbar-thumb { background: #252D54; border-radius: 2px; }
    .tw-msg {
      max-width: 88%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.55;
    }
    .tw-msg.user {
      align-self: flex-end;
      background: #C9A84C;
      color: #0D1538;
      font-weight: 500;
    }
    .tw-msg.assistant {
      align-self: flex-start;
      background: #141B3D;
      color: #E8EAF0;
      border: 1px solid #252D54;
    }
    .tw-msg.typing {
      align-self: flex-start;
      background: #141B3D;
      color: #6B7294;
      border: 1px solid #252D54;
      font-style: italic;
    }
    #takota-widget-footer {
      padding: 12px 14px;
      border-top: 1px solid #252D54;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    #takota-widget-input {
      flex: 1;
      background: #141B3D;
      border: 1px solid #252D54;
      border-radius: 8px;
      padding: 9px 12px;
      color: #E8EAF0;
      font-size: 13px;
      font-family: inherit;
      resize: none;
      max-height: 80px;
      outline: none;
      line-height: 1.4;
    }
    #takota-widget-input::placeholder { color: #6B7294; }
    #takota-widget-input:focus { border-color: #C9A84C44; }
    #takota-widget-send {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: #C9A84C;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #0D1538;
      flex-shrink: 0;
      transition: opacity 0.1s;
    }
    #takota-widget-send:disabled { background: #252D54; color: #6B7294; cursor: default; }
    #takota-widget-send:not(:disabled):hover { opacity: 0.85; }
    #takota-widget-disclaimer {
      padding: 6px 14px 10px;
      font-size: 10px;
      color: #6B7294;
      text-align: center;
    }
    @media (max-width: 400px) {
      #takota-widget-panel { width: calc(100vw - 24px); right: 12px; bottom: 84px; }
      #takota-widget-btn { right: 16px; bottom: 20px; }
    }
  `;

  // ── DOM helpers ────────────────────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function createWidget() {
    // Floating button
    const btn = document.createElement('button');
    btn.id = 'takota-widget-btn';
    btn.setAttribute('aria-label', 'Chat with Takota');
    btn.title = 'Chat with Takota';
    btn.innerHTML = '✦';
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'takota-widget-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Takota AI Companion');
    panel.innerHTML = `
      <div id="takota-widget-header">
        <div class="tw-avatar">✦</div>
        <div>
          <div class="tw-name">Takota</div>
          <div class="tw-status">AI companion · Divergify</div>
        </div>
        <button class="tw-close" aria-label="Close chat" id="takota-widget-close">×</button>
      </div>
      <div id="takota-widget-messages" role="log" aria-live="polite"></div>
      <div id="takota-widget-footer">
        <textarea
          id="takota-widget-input"
          placeholder="What's on your mind?"
          rows="1"
          maxlength="500"
          aria-label="Message Takota"
        ></textarea>
        <button id="takota-widget-send" aria-label="Send" disabled>→</button>
      </div>
      <div id="takota-widget-disclaimer">Not medical advice. Does not diagnose or treat any condition.</div>
    `;
    document.body.appendChild(panel);

    // Wire up events
    document.getElementById('takota-widget-close').addEventListener('click', closePanel);
    const input = document.getElementById('takota-widget-input');
    const sendBtn = document.getElementById('takota-widget-send');
    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim() || isLoading;
      // Auto-resize textarea
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendMessage();
      }
    });
    sendBtn.addEventListener('click', sendMessage);

    // Render any existing history
    history.forEach((msg) => appendMessage(msg.role, msg.content, false));

    // Welcome message if no history
    if (history.length === 0) {
      appendMessage('assistant', "Hey. I'm Takota. What's on your mind?", false);
    }
  }

  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    isOpen = true;
    document.getElementById('takota-widget-panel').classList.add('open');
    document.getElementById('takota-widget-btn').innerHTML = '×';
    setTimeout(() => {
      document.getElementById('takota-widget-input').focus();
      scrollToBottom();
    }, 50);
  }

  function closePanel() {
    isOpen = false;
    document.getElementById('takota-widget-panel').classList.remove('open');
    document.getElementById('takota-widget-btn').innerHTML = '✦';
  }

  function appendMessage(role, text, save = true) {
    const messages = document.getElementById('takota-widget-messages');
    const div = document.createElement('div');
    div.className = `tw-msg ${role}`;
    div.textContent = text;
    messages.appendChild(div);
    scrollToBottom();

    if (save) {
      history.push({ role, content: text });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (_) {}
    }
  }

  function scrollToBottom() {
    const messages = document.getElementById('takota-widget-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const messages = document.getElementById('takota-widget-messages');
    const div = document.createElement('div');
    div.className = 'tw-msg typing';
    div.id = 'takota-typing-indicator';
    div.textContent = 'Thinking…';
    messages.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById('takota-typing-indicator');
    if (el) el.remove();
  }

  async function sendMessage() {
    const input = document.getElementById('takota-widget-input');
    const sendBtn = document.getElementById('takota-widget-send');
    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    isLoading = true;

    appendMessage('user', text);
    showTyping();

    try {
      const payload = {
        '0': {
          json: {
            message: text,
            history: history.slice(-6).filter((m) => m.role !== 'user' || m.content !== text),
          },
        },
      };

      const res = await fetch(`${API_BASE}/api/trpc/takota.widgetChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // tRPC batch response: [{ result: { data: { json: { reply: "..." } } } }]
      const reply =
        data?.[0]?.result?.data?.json?.reply ||
        data?.result?.data?.json?.reply ||
        "I'm here. Something went sideways — try again?";

      removeTyping();
      appendMessage('assistant', reply);
    } catch (err) {
      removeTyping();
      appendMessage('assistant', "I'm here. Something went sideways on my end — try again?");
    } finally {
      isLoading = false;
      sendBtn.disabled = !input.value.trim();
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    createWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
