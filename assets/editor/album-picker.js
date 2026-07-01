(function (wp, config) {
  if (!wp || !wp.plugins || !wp.element || !wp.components || !wp.data || !wp.blocks) {
    return;
  }

  var el = wp.element.createElement;
  var Fragment = wp.element.Fragment;
  var useEffect = wp.element.useEffect;
  var useMemo = wp.element.useMemo;
  var useState = wp.element.useState;
  var __ = wp.i18n && wp.i18n.__ ? wp.i18n.__ : function (value) { return value; };
  var PluginSidebar = wp.editPost && wp.editPost.PluginSidebar;
  var PluginSidebarMoreMenuItem = wp.editPost && wp.editPost.PluginSidebarMoreMenuItem;
  var Button = wp.components.Button;
  var Notice = wp.components.Notice;
  var Spinner = wp.components.Spinner;
  var SelectControl = wp.components.SelectControl;
  var TextareaControl = wp.components.TextareaControl;

  if (!PluginSidebar || !PluginSidebarMoreMenuItem) {
    return;
  }

  var AUTH_STORAGE_KEY = config.authStorageKey || "lumicodex-admin-auth";
  var REFRESH_SKEW_MS = 15000;

  function apiUrl(path) {
    return new URL(String(path || "").replace(/^\/+/, ""), config.apiUrl).toString();
  }

  function readAuth() {
    try {
      var raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeAuth(auth) {
    if (!auth) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  }

  function getDate(value) {
    if (!value) return null;
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function tokenState(auth) {
    if (!auth || !auth.tokenExpires || !auth.refreshExpires) return "login";
    var limit = Date.now() + REFRESH_SKEW_MS;
    var tokenExpires = getDate(auth.tokenExpires);
    if (tokenExpires && limit < tokenExpires.getTime()) return "ok";
    var refreshExpires = getDate(auth.refreshExpires);
    return refreshExpires && limit < refreshExpires.getTime() ? "refresh" : "login";
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;
    var text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      return text;
    }
  }

  async function throwApiError(response) {
    var body = await parseResponse(response);
    var message = typeof body === "string"
      ? body
      : body && typeof body === "object" && body.message
        ? String(body.message)
        : response.statusText;
    throw new Error(message || "HTTP " + response.status);
  }

  async function refreshAuth(auth) {
    if (!auth || !auth.refresh) throw new Error(__("Sign in to LumiCodex first.", "lumicodex-advanced"));
    var response = await window.fetch(apiUrl("auth/refresh"), {
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: "Bearer " + auth.refresh,
      },
    });
    if (!response.ok) {
      writeAuth(null);
      await throwApiError(response);
    }
    var refreshed = await parseResponse(response);
    var nextAuth = Object.assign({}, auth, refreshed || {});
    nextAuth.refresh = refreshed && refreshed.refresh ? refreshed.refresh : auth.refresh;
    nextAuth.refreshExpires = refreshed && refreshed.refreshExpires ? refreshed.refreshExpires : auth.refreshExpires;
    writeAuth(nextAuth);
    return nextAuth;
  }

  async function getToken() {
    var auth = readAuth();
    var state = tokenState(auth);
    if (state === "login") {
      writeAuth(null);
      throw new Error(__("Sign in to LumiCodex first.", "lumicodex-advanced"));
    }
    if (state === "refresh") {
      auth = await refreshAuth(auth);
    }
    if (!auth || !auth.token) throw new Error(__("Sign in to LumiCodex first.", "lumicodex-advanced"));
    return auth.token;
  }

  async function apiGet(path) {
    var token = await getToken();
    var response = await window.fetch(apiUrl(path), {
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    if (!response.ok) await throwApiError(response);
    return parseResponse(response);
  }

  function normalizeInitialInfo(data) {
    var accounts = Array.isArray(data && data.accounts) ? data.accounts : [];
    var account = accounts[0] || null;
    var accountId = account ? account.pk || account.id || "" : "";
    var albums = (Array.isArray(data && data.containers) ? data.containers : [])
      .filter(function (container) {
        return container && container.subType === "album" && container.lastPublishedDate;
      })
      .sort(function (a, b) {
        return String(b.lastPublishedDate || "").localeCompare(String(a.lastPublishedDate || ""));
      });

    return {
      account: account,
      accountId: accountId,
      albums: albums,
    };
  }

  function escapeAttribute(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function albumAccessAttribute(album) {
    return Number(album.access) === 0 ? ' access="private"' : "";
  }

  function createComponentCode(accountId, album) {
    return [
      "<lc-embed",
      '  account-id="' + escapeAttribute(accountId) + '"',
      '  container-id="' + escapeAttribute(album.id) + '"' + albumAccessAttribute(album),
      "></lc-embed>",
    ].join("\n");
  }

  function createShortcode(accountId, album) {
    var parts = [
      "lumicodex_embed",
      'account_id="' + escapeAttribute(accountId) + '"',
      'container_id="' + escapeAttribute(album.id) + '"',
    ];
    if (Number(album.access) === 0) parts.push('access="private"');
    return "[" + parts.join(" ") + "]";
  }

  function insertCode(code, format) {
    var blockName = format === "shortcode" && wp.blocks.getBlockType("core/shortcode")
      ? "core/shortcode"
      : "core/html";
    var attributes = blockName === "core/shortcode" ? { text: code } : { content: code };
    var block = wp.blocks.createBlock(blockName, attributes);
    var dispatch = wp.data.dispatch("core/block-editor");
    if (!dispatch || !dispatch.insertBlocks) {
      throw new Error(__("The block editor insertion API is unavailable.", "lumicodex-advanced"));
    }
    dispatch.insertBlocks(block);
  }

  function formatDate(value) {
    var date = getDate(value);
    return date ? date.toLocaleString() : "";
  }

  function AlbumPickerSidebar() {
    var initialState = {
      accountId: "",
      albums: [],
      error: "",
      loading: true,
      selectedAlbumId: "",
      copied: false,
    };
    var stateTuple = useState(initialState);
    var state = stateTuple[0];
    var setState = stateTuple[1];

    async function loadAlbums() {
      setState(function (current) {
        return Object.assign({}, current, { loading: true, error: "", copied: false });
      });
      try {
        var info = normalizeInitialInfo(await apiGet("frontend/initial-info"));
        setState({
          accountId: info.accountId,
          albums: info.albums,
          error: "",
          loading: false,
          selectedAlbumId: info.albums[0] ? info.albums[0].id : "",
          copied: false,
        });
      } catch (err) {
        setState(function (current) {
          return Object.assign({}, current, {
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }

    useEffect(function () {
      loadAlbums();
    }, []);

    var selectedAlbum = useMemo(function () {
      return state.albums.find(function (album) {
        return album.id === state.selectedAlbumId;
      }) || null;
    }, [state.albums, state.selectedAlbumId]);

    var componentCode = selectedAlbum ? createComponentCode(state.accountId, selectedAlbum) : "";
    var shortcode = selectedAlbum ? createShortcode(state.accountId, selectedAlbum) : "";
    var options = state.albums.map(function (album) {
      return {
        label: (album.name || __("Untitled album", "lumicodex-advanced")) + " (" + (album.itemCount || 0) + ")",
        value: album.id,
      };
    });

    function handleInsert(format) {
      if (!selectedAlbum) return;
      try {
        insertCode(format === "shortcode" ? shortcode : componentCode, format);
      } catch (err) {
        setState(function (current) {
          return Object.assign({}, current, {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }

    function handleCopy(value) {
      if (!window.navigator.clipboard) return;
      window.navigator.clipboard.writeText(value).then(function () {
        setState(function (current) {
          return Object.assign({}, current, { copied: true });
        });
      });
    }

    return el(
      Fragment,
      null,
      el(
        PluginSidebarMoreMenuItem,
        { target: "lumicodex-albums-sidebar", icon: "format-gallery" },
        __("LumiCodex albums", "lumicodex-advanced")
      ),
      el(
        PluginSidebar,
        {
          name: "lumicodex-albums-sidebar",
          title: __("LumiCodex albums", "lumicodex-advanced"),
          icon: "format-gallery",
        },
        el(
          "div",
          { className: "lca-picker" },
          state.loading ? el("div", { className: "lca-picker__loading" }, el(Spinner, null)) : null,
          state.error ? el(
            Notice,
            { status: "warning", isDismissible: false },
            el("p", null, state.error),
            el(
              Button,
              { variant: "secondary", href: config.adminUrl, target: "_blank" },
              __("Open LumiCodex admin", "lumicodex-advanced")
            )
          ) : null,
          !state.loading && !state.error && state.albums.length === 0 ? el(
            Notice,
            { status: "info", isDismissible: false },
            __("No published albums were found. Publish an album in LumiCodex first.", "lumicodex-advanced")
          ) : null,
          state.albums.length > 0 ? el(
            Fragment,
            null,
            el(SelectControl, {
              label: __("Published album", "lumicodex-advanced"),
              value: state.selectedAlbumId,
              options: options,
              onChange: function (value) {
                setState(function (current) {
                  return Object.assign({}, current, { selectedAlbumId: value, copied: false });
                });
              },
            }),
            selectedAlbum ? el(
              "div",
              { className: "lca-picker__meta" },
              el("div", null, __("Published", "lumicodex-advanced") + ": " + formatDate(selectedAlbum.lastPublishedDate)),
              Number(selectedAlbum.access) === 0 ? el("div", null, __("Private album", "lumicodex-advanced")) : null
            ) : null,
            el(TextareaControl, {
              label: __("Web component", "lumicodex-advanced"),
              value: componentCode,
              readOnly: true,
              rows: 5,
            }),
            el(
              "div",
              { className: "lca-picker__actions" },
              el(Button, { variant: "primary", onClick: function () { handleInsert("component"); } }, __("Insert component", "lumicodex-advanced")),
              el(Button, { variant: "secondary", onClick: function () { handleCopy(componentCode); } }, __("Copy", "lumicodex-advanced"))
            ),
            el(TextareaControl, {
              label: __("Shortcode", "lumicodex-advanced"),
              value: shortcode,
              readOnly: true,
              rows: 3,
            }),
            el(
              "div",
              { className: "lca-picker__actions" },
              el(Button, { variant: "primary", onClick: function () { handleInsert("shortcode"); } }, __("Insert shortcode", "lumicodex-advanced")),
              el(Button, { variant: "secondary", onClick: function () { handleCopy(shortcode); } }, __("Copy", "lumicodex-advanced"))
            ),
            state.copied ? el("p", { className: "lca-picker__copied" }, __("Copied.", "lumicodex-advanced")) : null,
            el(
              Button,
              { variant: "tertiary", onClick: loadAlbums },
              __("Refresh albums", "lumicodex-advanced")
            )
          ) : null
        )
      )
    );
  }

  wp.plugins.registerPlugin("lumicodex-album-picker", {
    render: AlbumPickerSidebar,
    icon: "format-gallery",
  });
})(window.wp, window.LumiCodexWpAdvanced || {});
