/* UI adapter for the shared mobile Takota engine. No private provider key belongs here. */
(() => {
  "use strict";
  const STORAGE_KEY = "divergify_takota_web_v1";
  const PRIVACY_KEYS = [
    "divergify_tinfoil",
    "divergify_mode_tinfoil",
    "divergify_tinfoil_hat_mode",
    "divergify-mode",
  ];
  const ACTIVE = new Set(["active", "on", "true", "tin-foil-hat"]);
  const id = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  function mount(root) {
    const core = window.DivergifyTakotaCore;
    if (!core) {
      root.textContent =
        "Takota could not load. Reload this page to try again.";
      return;
    }
    const guard = new core.TakotaPrivacyGuard();
    let state = core.migrateState(null),
      storageBlocked = false,
      notice = "",
      busy = false;
    let controller = null,
      statusController = null,
      epoch = 0,
      statusEpoch = 0;
    let connection = "local",
      selectedTask = "",
      shareTask = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = core.appStateSchema.parse(JSON.parse(saved));
      else {
        // Preserve old website chat locally. Older messages never become live context.
        const old = JSON.parse(
          sessionStorage.getItem("takota_widget_history") || "[]",
        );
        if (Array.isArray(old))
          state.takota.messages = old
            .slice(-60)
            .filter(
              (m) =>
                m &&
                ["user", "assistant"].includes(m.role) &&
                typeof m.content === "string",
            )
            .map((m) => ({
              id: id(),
              role: m.role,
              text: m.content.slice(0, 1200),
              timestamp: Date.now(),
              source: "local",
            }));
      }
    } catch {
      storageBlocked = true;
      notice =
        "Saved data could not be read. It has not been overwritten. You can restore a backup or delete Takota data.";
    }
    // A new page needs a new live consent session. Saved local content is never opted in.
    state = {
      ...state,
      tinFoilHatMode: true,
      takotaConsentVersion: 0,
      takotaLiveSince: 0,
    };
    guard.hydrate(true, 0);
    const API = root.dataset.apiBase || "https://api.divergify.app";
    if (!/^https:\/\/[^/]+(?:\/)?$/.test(API))
      throw new Error("Takota API must be an HTTPS origin.");
    root.classList.add("tk-chat");
    root.innerHTML = `
      <div class="tk-row"><label class="tk-grow">Companion<select data-tk="persona" aria-label="Companion"></select></label><button data-tk="privacy" role="switch" aria-checked="true">Tin Foil Hat: on</button></div>
      <p data-tk="status" class="tk-status" aria-live="polite">Local guidance · no AI requests</p>
      <div class="tk-row" aria-label="Support state"><button data-mode="overloaded">Overloaded</button><button data-mode="stuck">Stuck</button><button data-mode="returning">Coming back</button></div>
      <div class="tk-row"><label class="tk-grow">Capacity<select data-tk="capacity" aria-label="Capacity today">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}">${n} / 5</option>`).join("")}</select></label><button data-tk="live">Choose live AI</button></div>
      <label>Saved action as context<select data-tk="task" aria-label="Saved action as context"><option value="">No task selected</option></select></label>
      <label data-tk="sharing" hidden><input type="checkbox" data-tk="share"> Share the selected task with live AI</label>
      <div class="tk-row" data-tk="returning" hidden><button data-tk="resume">Resume</button><button data-tk="later">Keep for later</button><button data-tk="close-task">Close task</button></div>
      <details><summary>My supports and return note</summary><label>Up to six supports, one per line<textarea data-tk="cards" aria-label="Saved supports" maxlength="1500" rows="3" placeholder="Example: put my headphones within reach"></textarea></label><label>Where to pick up<textarea data-tk="note" aria-label="Return note" maxlength="500" rows="2"></textarea></label><div class="tk-row"><button data-tk="save-supports">Save on this device</button><button data-tk="shades" role="switch" aria-checked="false">Shades: off</button></div></details>
      <p data-tk="notice" class="tk-notice" role="status" hidden></p>
      <div data-tk="messages" class="tk-messages" role="log" aria-label="Takota conversation" aria-live="polite" aria-relevant="additions"></div>
      <form data-tk="form"><label>Message to Takota<textarea data-tk="input" aria-label="Message to Takota" maxlength="500" rows="2" placeholder="Name the task you want to shrink…"></textarea></label><button type="submit" data-tk="send" class="tk-primary">Send</button></form>
      <div class="tk-row"><button data-tk="pause">Stop for today</button><button data-tk="clear">Clear chat</button></div>
      <details><summary>Saved actions</summary><p>Actions stay in this browser. Export a backup to move them into the mobile app.</p><div data-tk="actions"></div></details>
      <details><summary>My data</summary><p>Chat, supports, notes and actions are saved on this device. Backups include this text. Choose where you keep them.</p><div class="tk-row"><button data-tk="export">Export backup</button><button data-tk="delete">Delete Takota data</button></div><label>Restore a Divergify backup<input type="file" data-tk="import" accept="application/json,.json" aria-label="Restore a Divergify backup"></label></details>
      <p class="tk-footnote">A productivity tool for adults. AI can be wrong. No diagnosis, treatment or emergency care. Live AI is optional and limited; BYO keys and token packs are not available in this release.</p>
      <dialog data-tk="consent"><h2>Choose live AI</h2><p>For adults 18 and older. New live messages, live replies from this consent session, and capacity go to Divergify’s server and its Manus AI provider. A selected task is sent only when you check the sharing box. Local-only chat, saved supports and return notes are not uploaded.</p><p>Enabling live AI turns Takota’s Tin Foil Hat off. If the site’s privacy switch is on, turn it off first. Turning privacy on cancels pending replies and ends consent. Text already sent cannot be unsent. The app price does not include unlimited AI.</p><div class="tk-row"><button data-tk="enable" class="tk-primary">I’m 18 or older · enable live AI</button><button data-tk="decline">Keep local guidance</button></div></dialog>`;
    const $ = (name) => root.querySelector(`[data-tk="${name}"]`);
    for (const p of core.PERSONALITIES) {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.name;
      $("persona").append(option);
    }
    function externalPrivacy() {
      try {
        return PRIVACY_KEYS.some((key) =>
          ACTIVE.has(localStorage.getItem(key)),
        );
      } catch {
        return true;
      }
    }
    function abortChat() {
      epoch++;
      controller?.abort();
      controller = null;
      busy = false;
    }
    function abortAll() {
      abortChat();
      statusEpoch++;
      statusController?.abort();
      statusController = null;
    }
    function persist() {
      if (storageBlocked) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        notice =
          "Changes could not be saved on this device. Export a backup before closing this page.";
      }
    }
    function dispatch(action) {
      state = core.reducer(state, action);
      guard.hydrate(
        state.tinFoilHatMode,
        state.takota.ageRestricted ? 0 : state.takotaConsentVersion,
      );
      persist();
      render();
    }
    function allowed() {
      if (externalPrivacy() && !state.tinFoilHatMode) privacyOn();
      return guard.allowed() && !state.takota.ageRestricted;
    }
    function privacyOn() {
      abortAll();
      connection = "local";
      shareTask = false;
      dispatch({ type: "SET_TIN_FOIL_HAT", payload: true });
    }
    const task = () =>
      state.tasks.find((t) => t.id === selectedTask && t.status !== "done");
    const context = () => ({
      mode: state.takota.supportMode,
      capacity: state.currentCapacity,
      personality: state.activePersonality,
      task: task()?.text,
      resetCards: state.takota.resetCards,
      returnNote: state.takota.returnNote,
    });
    function append(reply) {
      dispatch({
        type: "ADD_CHAT_MESSAGES",
        payload: [
          {
            id: id(),
            role: "assistant",
            text: reply.content,
            timestamp: Date.now(),
            source: reply.source,
            boundary: reply.boundary,
            suggestion: reply.suggestion,
            personality: state.activePersonality,
          },
        ],
      });
    }
    function button(text, onClick) {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = text;
      el.addEventListener("click", onClick);
      return el;
    }
    function paragraph(text, className) {
      const el = document.createElement("p");
      el.textContent = text;
      if (className) el.className = className;
      return el;
    }
    let renderedMessages = "";
    function render() {
      $("persona").value = state.activePersonality;
      $("capacity").value = String(state.currentCapacity);
      root.dataset.shades = state.lowStimMode ? "on" : "off";
      $("shades").textContent = `Shades: ${state.lowStimMode ? "on" : "off"}`;
      $("shades").setAttribute("aria-checked", String(state.lowStimMode));
      $("privacy").textContent =
        `Tin Foil Hat: ${state.tinFoilHatMode ? "on" : "off"}`;
      $("privacy").setAttribute("aria-checked", String(state.tinFoilHatMode));
      root
        .querySelectorAll("[data-mode]")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.mode === state.takota.supportMode),
          ),
        );
      const live =
        !state.tinFoilHatMode &&
        state.takotaConsentVersion === core.TAKOTA_CONSENT_VERSION;
      $("status").textContent = busy
        ? "Waiting for live AI…"
        : connection === "checking"
          ? "Checking live AI…"
          : connection === "ready" && live
            ? "Live AI · limited · new consent-session messages only"
            : connection === "unavailable" && live
              ? "Live AI unavailable · local guidance works"
              : "Local guidance · no AI requests";
      $("live").textContent = live
        ? connection === "unavailable"
          ? "Retry connection"
          : "End live consent"
        : "Choose live AI";
      $("live").disabled = state.takota.ageRestricted;
      $("sharing").hidden = !live || !task();
      $("share").checked = shareTask;
      $("returning").hidden =
        state.takota.supportMode !== "returning" || !task();
      $("input").disabled = busy || state.takota.ageRestricted;
      $("send").disabled =
        busy || state.takota.ageRestricted || !$("input").value.trim();
      $("notice").textContent = notice;
      $("notice").hidden = !notice;
      const select = $("task");
      select.replaceChildren(new Option("No task selected", ""));
      state.tasks
        .filter((t) => t.status !== "done")
        .forEach((t) => select.add(new Option(t.text, t.id)));
      select.value = selectedTask;
      const signature = JSON.stringify(state.takota.messages);
      if (renderedMessages !== signature) {
        renderedMessages = signature;
        const log = $("messages");
        log.replaceChildren();
        if (!state.takota.messages.length)
          log.append(
            paragraph(
              "Pick the state that fits. Use a saved support, shrink a task, or find your way back. Local guidance uses templates.",
            ),
          );
        for (const m of state.takota.messages) {
          const bubble = document.createElement("article");
          bubble.className = `tk-bubble tk-${m.role}`;
          const name =
            core.PERSONALITIES.find((p) => p.id === m.personality)?.name ||
            "Takota";
          bubble.append(
            paragraph(
              m.role === "user"
                ? "You"
                : `${name} · ${m.source === "live" ? "live AI" : "local guidance"}`,
              "tk-caption",
            ),
            paragraph(m.text),
          );
          if (m.suggestion && !m.boundary && !state.takota.ageRestricted) {
            if (m.acceptedTaskId)
              bubble.append(
                paragraph("Saved to actions. Nothing starts automatically."),
              );
            else {
              bubble.append(paragraph("Proposed action · edit or ignore it"));
              const draft = document.createElement("textarea");
              draft.value = m.suggestion.text;
              draft.maxLength = 240;
              draft.setAttribute("aria-label", "Edit proposed action");
              bubble.append(draft);
              const row = document.createElement("div");
              row.className = "tk-row";
              row.append(
                button("Save action", () => {
                  if (draft.value.trim()) {
                    dispatch({
                      type: "ACCEPT_SUGGESTION",
                      payload: {
                        messageId: m.id,
                        task: core.newTask(draft.value.trim().slice(0, 240)),
                      },
                    });
                    $("note").value = state.takota.returnNote;
                  }
                }),
                button("Make smaller", () => {
                  draft.value = m.suggestion.smallerText;
                }),
              );
              bubble.append(row);
            }
          }
          log.append(bubble);
        }
        log.scrollTop = log.scrollHeight;
      }
      const actions = $("actions");
      actions.replaceChildren();
      if (!state.tasks.length)
        actions.append(paragraph("No saved actions yet."));
      for (const t of state.tasks) {
        const row = document.createElement("div");
        row.className = "tk-action";
        row.append(
          paragraph(`${t.status === "done" ? "Complete: " : ""}${t.text}`),
        );
        if (t.status !== "done")
          row.append(
            button("Mark complete", () => {
              dispatch({ type: "COMPLETE_TASK", payload: t.id });
              notice = "Action marked complete.";
              render();
            }),
          );
        row.append(
          button("Remove", () => {
            if (window.confirm("Remove this saved action?")) {
              dispatch({ type: "DELETE_TASK", payload: t.id });
            }
          }),
        );
        actions.append(row);
      }
    }
    async function rpc(path, signal, payload) {
      if (!allowed() || signal.aborted) throw new Error("Privacy is on.");
      const response = await fetch(
        `${API.replace(/\/$/, "")}/api/trpc/takota.${path}`,
        {
          method: payload ? "POST" : "GET",
          headers: payload ? { "Content-Type": "application/json" } : {},
          body: payload ? JSON.stringify({ json: payload }) : undefined,
          credentials: "omit",
          signal,
        },
      );
      if (!response.ok) throw new Error("Live AI unavailable.");
      const data = await response.json();
      if (!data?.result?.data?.json)
        throw new Error("Unexpected live response.");
      return data.result.data.json;
    }
    async function checkStatus() {
      if (!allowed()) return;
      const generation = ++statusEpoch;
      statusController?.abort();
      const request = new AbortController();
      statusController = request;
      const timeout = setTimeout(() => request.abort(), 15000);
      connection = "checking";
      render();
      try {
        const result = await guard.run(
          (signal) => rpc("status", signal),
          request.signal,
        );
        if (generation !== statusEpoch || !allowed()) return;
        connection = result.available === true ? "ready" : "unavailable";
        notice =
          result.available === true
            ? ""
            : "Live AI is unavailable. Local guidance still works.";
      } catch {
        if (generation !== statusEpoch) return;
        connection = "unavailable";
        notice = "Live AI is not connected. Local guidance still works.";
      } finally {
        clearTimeout(timeout);
        if (generation === statusEpoch) {
          statusController = null;
          render();
        }
      }
    }
    async function send(event) {
      event.preventDefault();
      const text = $("input").value.trim();
      if (!text || busy || state.takota.ageRestricted) return;
      const history = state.takota.messages,
        ctx = context();
      const live =
        allowed() &&
        connection === "ready" &&
        !core.boundaryReply(text) &&
        ctx.mode !== "overloaded" &&
        ctx.capacity > 1;
      const generation = ++epoch;
      const request = new AbortController();
      controller = request;
      busy = live;
      $("input").value = "";
      dispatch({
        type: "ADD_CHAT_MESSAGES",
        payload: [
          {
            id: id(),
            role: "user",
            text,
            timestamp: Date.now(),
            source: live ? "live" : "local",
          },
        ],
      });
      try {
        const reply = await core.sendTakota(
          {
            text,
            history,
            context: ctx,
            liveReady: live,
            consentSince: state.takotaLiveSince,
            shareTask,
            signal: request.signal,
          },
          (payload, signal) => rpc("chat", signal, payload),
          guard,
        );
        if (generation !== epoch || request.signal.aborted) return;
        append(reply);
        if (core.minorDisclosed(text) && reply.boundary !== "minor")
          append({
            content: core.MINOR_REPLY,
            suggestion: null,
            source: "local",
            boundary: "minor",
          });
        if (reply.notice) {
          notice = reply.notice;
          if (live) connection = "unavailable";
        }
      } finally {
        if (generation === epoch) {
          busy = false;
          controller = null;
          render();
        }
      }
    }
    $("form").addEventListener("submit", send);
    $("input").addEventListener("input", () => {
      $("send").disabled = busy || !$("input").value.trim();
    });
    $("input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (!$("send").disabled) $("form").requestSubmit();
      }
    });
    $("persona").addEventListener("change", () => {
      abortChat();
      dispatch({ type: "SET_PERSONALITY", payload: $("persona").value });
    });
    $("capacity").addEventListener("change", () => {
      abortChat();
      dispatch({ type: "SET_CAPACITY", payload: Number($("capacity").value) });
    });
    root.querySelectorAll("[data-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        abortChat();
        notice = "";
        dispatch({ type: "SET_SUPPORT_MODE", payload: b.dataset.mode });
        if (!state.takota.ageRestricted)
          append(
            core.localReply(
              b.dataset.mode === "stuck" ? "help" : "",
              context(),
            ),
          );
      }),
    );
    $("task").addEventListener("change", () => {
      abortChat();
      selectedTask = $("task").value;
      shareTask = false;
      render();
    });
    $("share").addEventListener("change", () => {
      shareTask = $("share").checked;
    });
    $("privacy").addEventListener("click", () => {
      if (!state.tinFoilHatMode) {
        notice = "Privacy is on. Pending replies were canceled.";
        privacyOn();
      } else {
        notice = "Choose live AI to review and enable sharing.";
        render();
      }
    });
    $("live").addEventListener("click", () => {
      if (guard.allowed()) {
        if (connection === "unavailable") void checkStatus();
        else {
          notice = "Live consent ended.";
          privacyOn();
        }
      } else $("consent").showModal();
    });
    $("decline").addEventListener("click", () => $("consent").close());
    $("enable").addEventListener("click", () => {
      if (externalPrivacy()) {
        notice =
          "The site’s Tin Foil Hat is on. Turn that switch off before enabling live AI.";
        $("consent").close();
        render();
        return;
      }
      if (state.takota.ageRestricted) return;
      dispatch({ type: "SET_TIN_FOIL_HAT", payload: false });
      dispatch({
        type: "SET_TAKOTA_CONSENT",
        payload: { version: core.TAKOTA_CONSENT_VERSION, since: Date.now() },
      });
      $("consent").close();
      void checkStatus();
    });
    $("save-supports").addEventListener("click", () => {
      const cards = $("cards")
        .value.split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (cards.length > 6 || cards.some((s) => s.length > 240)) {
        notice = "Use up to six supports, each under 240 characters.";
        render();
        return;
      }
      dispatch({ type: "SET_RESET_CARDS", payload: cards });
      dispatch({ type: "SET_RETURN_NOTE", payload: $("note").value });
      notice = "Supports and return note saved on this device.";
      render();
    });
    $("shades").addEventListener("click", () =>
      dispatch({ type: "SET_LOW_STIM", payload: !state.lowStimMode }),
    );
    $("pause").addEventListener("click", () => {
      abortChat();
      const note =
        $("input").value.trim() || task()?.text || state.takota.returnNote;
      dispatch({ type: "SET_RETURN_NOTE", payload: note });
      $("note").value = note;
      dispatch({ type: "SET_SUPPORT_MODE", payload: "returning" });
      append(core.localReply("pause", context()));
    });
    $("resume").addEventListener("click", () =>
      append(core.localReply("", context())),
    );
    $("later").addEventListener("click", () => {
      if (task()) {
        dispatch({
          type: "SET_RETURN_NOTE",
          payload: `For later: ${task().text}`,
        });
        $("note").value = state.takota.returnNote;
        notice = "Kept for later. No reminder was scheduled.";
        render();
      }
    });
    $("close-task").addEventListener("click", () => {
      if (task() && window.confirm("Remove the selected task?")) {
        dispatch({ type: "DELETE_TASK", payload: task().id });
        selectedTask = "";
        render();
      }
    });
    $("clear").addEventListener("click", () => {
      if (
        window.confirm(
          "Clear this chat? Actions, supports and your return note will stay.",
        )
      ) {
        abortChat();
        dispatch({ type: "CLEAR_CHAT" });
      }
    });
    $("export").addEventListener("click", () => {
      const url = URL.createObjectURL(
        new Blob([core.exportLocalData(state)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "divergify-local-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    $("import").addEventListener("change", async () => {
      const file = $("import").files[0];
      if (!file) return;
      try {
        if (file.size > 2000000) throw new Error("Backup is too large.");
        const restored = core.importLocalData(await file.text());
        if (
          !window.confirm(
            `Replace local Takota data with ${restored.tasks.length} tasks and ${restored.takota.messages.length} messages? Privacy will be on.`,
          )
        )
          return;
        abortAll();
        guard.hydrate(true, 0);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
        storageBlocked = false;
        state = restored;
        connection = "local";
        selectedTask = "";
        shareTask = false;
        $("cards").value = state.takota.resetCards.join("\n");
        $("note").value = state.takota.returnNote;
        notice = "Backup restored. Privacy is on.";
        render();
      } catch {
        notice =
          "Backup could not be restored. Existing data has not been replaced.";
        render();
      } finally {
        $("import").value = "";
      }
    });
    $("delete").addEventListener("click", () => {
      if (
        !window.confirm(
          "Delete this browser’s Takota chat, supports, notes and saved actions?",
        )
      )
        return;
      abortAll();
      guard.hydrate(true, 0);
      try {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem("takota_widget_history");
        sessionStorage.removeItem("takota_fullpage_history");
        storageBlocked = false;
        state = core.migrateState(null);
        selectedTask = "";
        shareTask = false;
        connection = "local";
        $("cards").value = "";
        $("note").value = "";
        notice = "Takota data deleted from this browser.";
        render();
      } catch {
        notice = "Data could not be deleted. Privacy is on for this page.";
        privacyOn();
      }
    });
    function modesChanged() {
      if (externalPrivacy()) {
        notice = "Site privacy is on. Live consent ended.";
        privacyOn();
      }
    }
    window.addEventListener("divergify:modes-changed", modesChanged);
    window.addEventListener("storage", (event) => {
      if (PRIVACY_KEYS.includes(event.key)) modesChanged();
      if (event.key === STORAGE_KEY) {
        // Changing saved data in another tab always ends this tab's consent.
        abortAll();
        guard.hydrate(true, 0);
        connection = "local";
        shareTask = false;
        try {
          const next = event.newValue
            ? core.appStateSchema.parse(JSON.parse(event.newValue))
            : core.migrateState(null);
          state = {
            ...next,
            tinFoilHatMode: true,
            takotaConsentVersion: 0,
            takotaLiveSince: 0,
          };
          $("cards").value = state.takota.resetCards.join("\n");
          $("note").value = state.takota.returnNote;
          notice = "Data changed in another tab. Live consent ended here.";
          render();
        } catch {
          notice =
            "Data in another tab could not be loaded. Live consent ended here.";
          state = {
            ...state,
            tinFoilHatMode: true,
            takotaConsentVersion: 0,
            takotaLiveSince: 0,
          };
          render();
        }
      }
    });
    window.addEventListener("pagehide", abortAll);
    $("cards").value = state.takota.resetCards.join("\n");
    $("note").value = state.takota.returnNote;
    persist();
    render();
    return { pause: privacyOn };
  }
  window.DivergifyTakotaChat = { mount };
  document.querySelectorAll("[data-takota-root]").forEach(mount);
})();
