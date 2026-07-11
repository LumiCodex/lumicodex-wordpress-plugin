(function (window) {
  "use strict";
  var config = window.LumiCodexWpAdvanced || {};
  var AUTH_KEY = config.authStorageKey || "lumicodex-admin-auth";
  var PENDING_PREFIX = "lumicodex-wordpress-auth-";
  var MAX_AGE = 10 * 60 * 1000;
  var REFRESH_SKEW = 15000;
  var listeners = [];

  function apiUrl(path) { return new URL(String(path || "").replace(/^\/+/, ""), config.apiUrl).toString(); }
  function base64Url(bytes) {
    var binary = "";
    new Uint8Array(bytes).forEach(function (value) { binary += String.fromCharCode(value); });
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function randomValue(length) {
    var bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return base64Url(bytes);
  }
  function readAuth() { try { var raw = window.localStorage.getItem(AUTH_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; } }
  function writeAuth(auth) {
    if (auth) window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    else window.localStorage.removeItem(AUTH_KEY);
    notify(auth ? "connected" : "disconnected");
  }
  function notify(type, error) { listeners.slice().forEach(function (fn) { fn({ type: type, error: error || "" }); }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (item) { return item !== fn; }); }; }
  function parseDate(value) { var date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
  function tokenState(auth) {
    if (!auth || !auth.tokenExpires || !auth.refreshExpires) return "login";
    var limit = Date.now() + REFRESH_SKEW;
    var tokenExpires = parseDate(auth.tokenExpires);
    if (tokenExpires && limit < tokenExpires.getTime()) return "ok";
    var refreshExpires = parseDate(auth.refreshExpires);
    return refreshExpires && limit < refreshExpires.getTime() ? "refresh" : "login";
  }
  async function json(response) { var text = await response.text(); if (!text) return null; try { return JSON.parse(text); } catch (_) { return text; } }
  async function check(response) {
    if (response.ok) return json(response);
    var body = await json(response);
    throw new Error(body && body.message ? body.message : typeof body === "string" && body ? body : "LumiCodex returned HTTP " + response.status + ".");
  }
  async function refresh(auth) {
    try {
      var result = await check(await window.fetch(apiUrl("auth/refresh"), { headers: { Authorization: "Bearer " + auth.refresh } }));
      var next = Object.assign({}, auth, result || {});
      next.refresh = result && result.refresh ? result.refresh : auth.refresh;
      next.refreshExpires = result && result.refreshExpires ? result.refreshExpires : auth.refreshExpires;
      writeAuth(next); return next;
    } catch (error) { writeAuth(null); throw new Error("Your LumiCodex session expired. Connect again."); }
  }
  async function getToken() {
    var auth = readAuth(); var state = tokenState(auth);
    if (state === "login") { writeAuth(null); throw new Error("Connect LumiCodex to continue."); }
    if (state === "refresh") auth = await refresh(auth);
    return auth.token;
  }
  async function apiGet(path) { return check(await window.fetch(apiUrl(path), { headers: { Authorization: "Bearer " + await getToken() } })); }

  async function connect() {
    if (!window.crypto || !window.crypto.subtle || !window.crypto.getRandomValues) throw new Error("This browser cannot create a secure LumiCodex connection (Web Crypto is unavailable).");
    var popup = window.open("about:blank", "lumicodex-wordpress-connect", "popup=yes,width=600,height=760");
    if (!popup) throw new Error("The connection popup was blocked. Allow popups for this site and try again.");
    popup.document.title = "Connecting to LumiCodex…";
    try {
      var state = randomValue(32); var verifier = randomValue(64);
      var digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
      var pending = { verifier: verifier, createdAt: Date.now(), redirectUri: config.callbackUrl };
      window.localStorage.setItem(PENDING_PREFIX + state, JSON.stringify(pending));
      var target = new URL(config.serviceAdminUrl);
      target.searchParams.set("integration", "wordpress"); target.searchParams.set("redirect_uri", config.callbackUrl);
      target.searchParams.set("state", state); target.searchParams.set("code_challenge", base64Url(digest)); target.searchParams.set("code_challenge_method", "S256");
      popup.location.replace(target.toString());
      var timer = window.setInterval(function () {
        if (!popup.closed) return;
        window.clearInterval(timer);
        if (window.localStorage.getItem(PENDING_PREFIX + state)) {
          window.localStorage.removeItem(PENDING_PREFIX + state);
          notify("cancelled", "The LumiCodex connection window was closed.");
        }
      }, 500);
    } catch (error) { popup.close(); throw error; }
  }

  async function completeCallback() {
    var params = new URLSearchParams(window.location.search), code = params.get("code"), state = params.get("state"), errorCode = params.get("error");
    if (!state || (!code && !errorCode)) return false;
    var key = PENDING_PREFIX + state, pending = null;
    try { pending = JSON.parse(window.localStorage.getItem(key) || "null"); } catch (_) {}
    window.localStorage.removeItem(key);
    ["code", "state", "error", "error_description"].forEach(function (keyName) { params.delete(keyName); });
    window.history.replaceState(null, "", window.location.pathname + (params.toString() ? "?" + params : "") + window.location.hash);
    try {
      if (!pending || !pending.verifier || !pending.createdAt || Date.now() - pending.createdAt > MAX_AGE) throw new Error("This LumiCodex connection attempt expired. Please try again.");
      if (errorCode) throw new Error(errorCode === "access_denied" ? "LumiCodex connection was cancelled." : "LumiCodex could not complete the connection.");
      var auth = await check(await window.fetch(apiUrl("auth/integrations/wordpress/exchange"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code, codeVerifier: pending.verifier, redirectUri: pending.redirectUri }) }));
      writeAuth(auth);
      if (window.opener) window.opener.postMessage({ type: "lumicodex-auth-connected" }, window.location.origin);
    } catch (error) {
      notify("error", error.message);
      if (window.opener) window.opener.postMessage({ type: "lumicodex-auth-error", message: error.message }, window.location.origin);
    }
    if (window.opener) window.close();
    return true;
  }
  window.addEventListener("message", function (event) { if (event.origin !== window.location.origin || !event.data) return; if (event.data.type === "lumicodex-auth-connected") notify("connected"); if (event.data.type === "lumicodex-auth-error") notify("error", event.data.message); });
  window.addEventListener("storage", function (event) { if (event.key === AUTH_KEY) notify(event.newValue ? "connected" : "disconnected"); });
  window.LumiCodexWpAuth = { readAuth: readAuth, clear: function () { writeAuth(null); }, connect: connect, completeCallback: completeCallback, getToken: getToken, apiGet: apiGet, subscribe: subscribe };
  completeCallback();
  window.addEventListener("DOMContentLoaded", function () {
    var root = window.document.getElementById("lca-browser-connection");
    if (!root) return;
    function render(message) {
      var connected = Boolean(readAuth());
      root.innerHTML = connected
        ? '<p><strong>LumiCodex is connected in this browser.</strong></p><p><a class="button button-primary" href="' + String(config.serviceAdminUrl).replace(/"/g, "&quot;") + '" target="_blank" rel="noopener noreferrer">Manage albums</a> <button type="button" class="button" data-lca-disconnect>Disconnect from this browser</button></p>'
        : '<p>Connect this browser to list and insert your published LumiCodex albums.</p><p><button type="button" class="button button-primary" data-lca-connect>Connect LumiCodex</button></p>';
      if (message) root.insertAdjacentHTML("beforeend", '<p class="notice notice-warning inline"><span>' + String(message).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</span></p>");
      var connectButton = root.querySelector("[data-lca-connect]"); if (connectButton) connectButton.onclick = function () { connect().catch(function (error) { render(error.message); }); };
      var disconnectButton = root.querySelector("[data-lca-disconnect]"); if (disconnectButton) disconnectButton.onclick = function () { writeAuth(null); };
    }
    subscribe(function (event) { render(event.error); }); render();
  });
})(window);
