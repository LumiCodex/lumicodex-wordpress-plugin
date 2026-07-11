(function (wp) {
  "use strict";

  if (
    !wp ||
    !wp.blocks ||
    !wp.blockEditor ||
    !wp.element ||
    !wp.components
  ) {
    return;
  }

  var el = wp.element.createElement;
  var Fragment = wp.element.Fragment;
  var useEffect = wp.element.useEffect;
  var useState = wp.element.useState;
  var __ = wp.i18n && wp.i18n.__ ? wp.i18n.__ : function (value) { return value; };
  var BlockControls = wp.blockEditor.BlockControls;
  var useBlockProps = wp.blockEditor.useBlockProps;
  var Button = wp.components.Button;
  var Notice = wp.components.Notice;
  var Spinner = wp.components.Spinner;
  var ToolbarButton = wp.components.ToolbarButton;
  var ToolbarGroup = wp.components.ToolbarGroup;
  var browserAuth = window.LumiCodexWpAuth;

  function normalizeInitialInfo(data) {
    var accounts = Array.isArray(data && data.accounts) ? data.accounts : [];
    var account = accounts[0] || null;
    var accountId = account ? account.pk || account.id || "" : "";
    var published = (Array.isArray(data && data.containers) ? data.containers : [])
      .filter(function (container) {
        return container && container.subType === "album" && container.lastPublishedDate;
      })
      .sort(function (a, b) {
        return String(b.lastPublishedDate || "").localeCompare(String(a.lastPublishedDate || ""));
      });

    return {
      accountId: accountId,
      albums: published.filter(function (album) { return Number(album.access) !== 0; }),
      privateAlbumCount: published.filter(function (album) { return Number(album.access) === 0; }).length,
    };
  }

  function albumTitle(album) {
    return album.name || __("Untitled album", "lumicodex-advanced");
  }

  function photoCount(album) {
    var count = Number(album.itemCount);
    if (!Number.isFinite(count)) count = Array.isArray(album.items) ? album.items.length : 0;
    return count;
  }

  function firstPicture(album) {
    var items = Array.isArray(album.items) ? album.items : [];
    return items.find(function (item) {
      return item && item.id && Number(item.access) !== 0 && Number(item.width) > 0 && Number(item.height) > 0;
    }) || null;
  }

  function pictureAttributes(accountId, album, picture) {
    if (!picture) return null;
    var attributes = {
      "account-id": accountId,
      "container-id": album.id,
      "item-id": picture.id,
      width: String(picture.width),
      height: String(picture.height),
      "height-mode": "fill",
      position: "smart",
      "aria-hidden": "true",
    };
    if (picture.extension) attributes.extension = picture.extension;
    if (Array.isArray(picture.formats) && picture.formats.length) attributes.formats = picture.formats.join(",");
    if (Array.isArray(picture.previews) && picture.previews.length) attributes.previews = picture.previews.join(",");
    if (picture.tileSize) attributes["tile-size"] = String(picture.tileSize);
    if (picture.smartX != null) attributes["smart-x"] = String(picture.smartX);
    if (picture.smartY != null) attributes["smart-y"] = String(picture.smartY);
    return attributes;
  }

  function AlbumCard(props) {
    var album = props.album;
    var count = photoCount(album);
    var picture = firstPicture(album);
    var preview = picture ? el("lc-picture", pictureAttributes(props.accountId, album, picture)) : el(
      "span",
      { className: "lca-album-card__empty", "aria-hidden": "true" },
      el("span", { className: "dashicons dashicons-format-gallery" })
    );

    return el(
      "button",
      {
        type: "button",
        className: "lca-album-card",
        onClick: function () { props.onSelect(album); },
        "aria-label": __("Insert", "lumicodex-advanced") + " " + albumTitle(album),
      },
      el("span", { className: "lca-album-card__preview" }, preview),
      el(
        "span",
        { className: "lca-album-card__body" },
        el("strong", { className: "lca-album-card__title" }, albumTitle(album)),
        el(
          "span",
          { className: "lca-album-card__meta" },
          count + " " + (count === 1 ? __("photo", "lumicodex-advanced") : __("photos", "lumicodex-advanced"))
        )
      )
    );
  }

  function AlbumChooser(props) {
    var stateTuple = useState({
      accountId: "",
      albums: [],
      privateAlbumCount: 0,
      error: "",
      loading: true,
    });
    var state = stateTuple[0];
    var setState = stateTuple[1];

    function loadAlbums() {
      setState(function (current) { return Object.assign({}, current, { error: "", loading: true }); });
      if (!browserAuth || !browserAuth.apiGet) {
        setState(function (current) {
          return Object.assign({}, current, { error: __("LumiCodex connection is unavailable.", "lumicodex-advanced"), loading: false });
        });
        return;
      }
      browserAuth.apiGet("frontend/initial-info").then(function (data) {
        var info = normalizeInitialInfo(data);
        setState({
          accountId: info.accountId,
          albums: info.albums,
          privateAlbumCount: info.privateAlbumCount,
          error: "",
          loading: false,
        });
      }).catch(function (error) {
        setState(function (current) {
          return Object.assign({}, current, {
            error: error instanceof Error ? error.message : String(error),
            loading: false,
          });
        });
      });
    }

    useEffect(function () {
      loadAlbums();
      return browserAuth && browserAuth.subscribe ? browserAuth.subscribe(function (event) {
        if (event.type === "connected") loadAlbums();
        else if (event.error) setState(function (current) {
          return Object.assign({}, current, { error: event.error, loading: false });
        });
      }) : undefined;
    }, []);

    if (state.loading) {
      return el("div", { className: "lca-album-chooser__loading" }, el(Spinner, null), el("span", null, __("Loading your published albums…", "lumicodex-advanced")));
    }

    if (state.error) {
      return el(
        Notice,
        { status: "warning", isDismissible: false, className: "lca-album-chooser__notice" },
        el("p", null, state.error),
        el(
          Button,
          {
            variant: "primary",
            onClick: function () {
              browserAuth.connect().catch(function (error) {
                setState(function (current) { return Object.assign({}, current, { error: error.message }); });
              });
            },
          },
          __("Connect LumiCodex", "lumicodex-advanced")
        )
      );
    }

    if (!state.albums.length) {
      var message = state.privateAlbumCount
        ? __("Your published albums are private. Make an album public in LumiCodex before adding it to a public WordPress page.", "lumicodex-advanced")
        : __("No published albums are available yet. Publish an album in LumiCodex, then refresh this list.", "lumicodex-advanced");
      return el(
        Notice,
        { status: "info", isDismissible: false, className: "lca-album-chooser__notice" },
        el("p", null, message),
        el(Button, { variant: "secondary", onClick: loadAlbums }, __("Refresh albums", "lumicodex-advanced"))
      );
    }

    return el(
      Fragment,
      null,
      el("p", { className: "lca-album-chooser__intro" }, __("Choose the album to show in this post.", "lumicodex-advanced")),
      state.privateAlbumCount ? el(
        "p",
        { className: "lca-album-chooser__private-note" },
        __("Private albums are hidden because visitors to a public WordPress page cannot load them.", "lumicodex-advanced")
      ) : null,
      el(
        "div",
        { className: "lca-album-grid" },
        state.albums.map(function (album) {
          return el(AlbumCard, {
            key: album.id,
            accountId: state.accountId,
            album: album,
            onSelect: function (selected) { props.onSelect(state.accountId, selected); },
          });
        })
      ),
      el(Button, { variant: "tertiary", onClick: loadAlbums, className: "lca-album-chooser__refresh" }, __("Refresh albums", "lumicodex-advanced"))
    );
  }

  function AlbumBlockEdit(props) {
    var attributes = props.attributes;
    var editingTuple = useState(!attributes.containerId);
    var choosing = editingTuple[0];
    var setChoosing = editingTuple[1];
    var blockProps = useBlockProps({ className: "lca-album-block" });

    function chooseAlbum(accountId, album) {
      props.setAttributes({
        accountId: accountId,
        containerId: album.id,
        albumName: albumTitle(album),
      });
      setChoosing(false);
    }

    return el(
      Fragment,
      null,
      attributes.containerId ? el(
        BlockControls,
        null,
        el(
          ToolbarGroup,
          null,
          el(ToolbarButton, { icon: "update", onClick: function () { setChoosing(!choosing); } }, choosing ? __("Show preview", "lumicodex-advanced") : __("Replace album", "lumicodex-advanced"))
        )
      ) : null,
      el(
        "div",
        blockProps,
        choosing || !attributes.containerId ? el(
          "div",
          { className: "lca-album-chooser" },
          el("h3", null, attributes.containerId ? __("Replace album", "lumicodex-advanced") : __("Choose a LumiCodex album", "lumicodex-advanced")),
          el(AlbumChooser, { onSelect: chooseAlbum })
        ) : el(
          Fragment,
          null,
          el(
            "div",
            { className: "lca-album-block__header" },
            el("strong", null, attributes.albumName || __("LumiCodex album", "lumicodex-advanced")),
            el(Button, { variant: "link", onClick: function () { setChoosing(true); } }, __("Replace", "lumicodex-advanced"))
          ),
          el(
            "div",
            { className: "lca-album-block__preview" },
            el("lc-embed", {
              key: attributes.accountId + ":" + attributes.containerId,
              "account-id": attributes.accountId,
              "container-id": attributes.containerId,
              "disable-media-view": "true",
            })
          )
        )
      )
    );
  }

  function AlbumBlockSave(props) {
    var attributes = props.attributes;
    if (!attributes.accountId || !attributes.containerId) return null;
    return el("lc-embed", Object.assign({}, useBlockProps.save(), {
      "account-id": attributes.accountId,
      "container-id": attributes.containerId,
    }));
  }

  wp.blocks.registerBlockType("lumicodex/album", {
    apiVersion: 2,
    title: __("LumiCodex Album", "lumicodex-advanced"),
    description: __("Add a published LumiCodex photo album with a live preview.", "lumicodex-advanced"),
    category: "media",
    icon: "format-gallery",
    keywords: [__("photos", "lumicodex-advanced"), __("gallery", "lumicodex-advanced"), __("album", "lumicodex-advanced")],
    attributes: {
      accountId: { type: "string", default: "" },
      containerId: { type: "string", default: "" },
      albumName: { type: "string", default: "" },
    },
    supports: {
      align: ["wide", "full"],
      html: false,
    },
    edit: AlbumBlockEdit,
    save: AlbumBlockSave,
  });
})(window.wp);
