const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { JSDOM } = require("jsdom");
const { runInContext } = require("node:vm");
const path = require("node:path").join(__dirname, "../");
const flush = () => new Promise((resolve) => setImmediate(resolve));
function setup({ saved, provider } = {}) {
  const dom = new JSDOM("<section data-takota-root></section>", {
    url: "https://divergify.app/takota.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window,
    requests = [];
  w.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  w.confirm = () => true;
  if (saved) w.localStorage.setItem("divergify_takota_web_v1", saved);
  w.fetch = async (url, options) => {
    requests.push({ url, options });
    return provider
      ? provider(url, options)
      : {
          ok: true,
          json: async () => ({
            result: { data: { json: { available: true } } },
          }),
        };
  };
  runInContext(
    readFileSync(path + "js/takota-core.js", "utf8"),
    dom.getInternalVMContext(),
  );
  runInContext(
    readFileSync(path + "js/takota-chat.js", "utf8"),
    dom.getInternalVMContext(),
  );
  const $ = (name) => w.document.querySelector(`[data-tk="${name}"]`);
  const click = (name) => $(name).click();
  const set = (name, value) => {
    $(name).value = value;
    $(name).dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  const send = async (text) => {
    set("input", text);
    $("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
    await flush();
  };
  const state = () =>
    JSON.parse(w.localStorage.getItem("divergify_takota_web_v1"));
  const enable = async () => {
    click("live");
    click("enable");
    await flush();
  };
  return { dom, w, $, click, set, send, state, enable, requests };
}
test("local task flow makes zero API calls and saves one editable queued action", async () => {
  const a = setup();
  await a.send("Pay the bill");
  assert.equal(a.requests.length, 0);
  const edit = a.w.document.querySelector(
    '[aria-label="Edit proposed action"]',
  );
  assert.match(edit.value, /due date/);
  edit.value = "Put the bill on my desk";
  const save = [...a.w.document.querySelectorAll("button")].find(
    (b) => b.textContent === "Save action",
  );
  save.click();
  save.click();
  assert.equal(a.state().tasks.length, 1);
  assert.equal(a.state().tasks[0].text, "Put the bill on my desk");
  assert.equal(a.state().tasks[0].status, "queued");
  assert.equal(a.$("note").value, "Put the bill on my desk");
  a.dom.window.close();
});
test("supports and return note survive reload; overload stays local and clears only chat", async () => {
  const a = setup();
  a.set("cards", "Headphones within reach");
  a.set("note", "Open my draft");
  a.click("save-supports");
  a.w.document.querySelector('[data-mode="overloaded"]').click();
  assert.match(a.$("messages").textContent, /Headphones within reach/);
  a.click("clear");
  const b = setup({ saved: JSON.stringify(a.state()) });
  assert.equal(b.$("note").value, "Open my draft");
  assert.equal(b.$("cards").value, "Headphones within reach");
  assert.equal(b.state().takota.messages.length, 0);
  assert.equal(b.requests.length, 0);
  a.dom.window.close();
  b.dom.window.close();
});
test("live wire payload excludes local chat, supports, notes, and unshared tasks", async () => {
  const a = setup({
    provider: async (url) => ({
      ok: true,
      json: async () => ({
        result: {
          data: {
            json: url.endsWith("status")
              ? { available: true }
              : { content: "Open the bill.", suggestion: null, source: "live" },
          },
        },
      }),
    }),
  });
  a.set("cards", "Private support");
  a.set("note", "Private return note");
  a.click("save-supports");
  await a.send("Private local message");
  await a.enable();
  await a.send("Pay the bill");
  const request = a.requests.find((r) => r.url.endsWith("chat"));
  assert.ok(request);
  const wire = JSON.parse(request.options.body);
  assert.equal(wire.json.adult, true);
  assert.equal(wire.json.privacyMode, false);
  assert.equal(wire.json.consentVersion, 1);
  assert.equal(wire.json.messages.length, 1);
  assert.equal(wire.json.messages[0].content, "Pay the bill");
  assert.ok(!request.options.body.includes("Private"));
  assert.equal(request.options.credentials, "omit");
  assert.match(a.$("messages").textContent, /live AI/);
  a.dom.window.close();
});
test("privacy cancels an in-flight reply even if provider ignores the AbortSignal", async () => {
  let finish, signal;
  const a = setup({
    provider: async (url, options) =>
      url.endsWith("status")
        ? {
            ok: true,
            json: async () => ({
              result: { data: { json: { available: true } } },
            }),
          }
        : new Promise((resolve) => {
            signal = options.signal;
            finish = resolve;
          }),
  });
  await a.enable();
  const pending = a.send("Pay the bill");
  await flush();
  assert.ok(signal);
  a.click("privacy");
  assert.equal(signal.aborted, true);
  finish({
    ok: true,
    json: async () => ({
      result: {
        data: {
          json: {
            content: "A stale live reply",
            suggestion: null,
            source: "live",
          },
        },
      },
    }),
  });
  await pending;
  await flush();
  assert.ok(!a.$("messages").textContent.includes("A stale live reply"));
  const count = a.requests.length;
  await a.send("Do the dishes");
  assert.equal(a.requests.length, count);
  assert.equal(a.state().takotaConsentVersion, 0);
  a.dom.window.close();
});
test("site privacy changes end live consent and prevent additional requests", async () => {
  const a = setup();
  await a.enable();
  a.w.localStorage.setItem("divergify_tinfoil", "active");
  a.w.dispatchEvent(new a.w.Event("divergify:modes-changed"));
  const count = a.requests.length;
  await a.send("Pay the bill");
  assert.equal(a.requests.length, count);
  assert.equal(a.state().tinFoilHatMode, true);
  a.dom.window.close();
});
test("unavailable and malformed live replies produce useful local guidance", async () => {
  const a = setup({
    provider: async (url) => ({
      ok: true,
      json: async () => ({
        result: {
          data: {
            json: url.endsWith("status")
              ? { available: true }
              : { content: "", source: "live" },
          },
        },
      }),
    }),
  });
  await a.enable();
  await a.send("Pay the bill");
  assert.match(
    a.w.document.querySelector('[aria-label="Edit proposed action"]').value,
    /due date/,
  );
  assert.match(a.$("notice").textContent, /local guidance/);
  a.dom.window.close();
});
test("minor disclosure closes conversation locally, persists the lock, and never invokes AI", async () => {
  const a = setup();
  await a.send("I'm 14");
  assert.equal(a.requests.length, 0);
  assert.equal(a.$("input").disabled, true);
  assert.equal(a.$("live").disabled, true);
  a.click("clear");
  assert.equal(a.$("input").disabled, true);
  const b = setup({ saved: JSON.stringify(a.state()) });
  assert.equal(b.$("input").disabled, true);
  a.dom.window.close();
  b.dom.window.close();
});
test("corrupt storage is not overwritten and chat text cannot execute HTML", async () => {
  const a = setup({ saved: "broken" });
  await a.send("<img src=x onerror=alert(1)>");
  assert.equal(a.w.localStorage.getItem("divergify_takota_web_v1"), "broken");
  assert.equal(a.$("messages").querySelector("img"), null);
  assert.match(a.$("notice").textContent, /not been overwritten/);
  a.dom.window.close();
});
