=== LumiCodex Advanced Embed Manager ===
Contributors: lumicodex
Tags: lumicodex, web components, albums, embed, block editor
Requires at least: 5.8
Tested up to: 7.0
Requires PHP: 7.2
Stable tag: 1.0.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adds LumiCodex admin tools, a published-album picker for the block editor, and frontend support for legacy and modern LumiCodex embeds.

== Description ==

This advanced plugin includes:

* A WordPress admin menu page at LumiCodex that links to, or loads, the hosted LumiCodex admin panel.
* A block editor sidebar picker that lists only published albums.
* Insert buttons for raw `<lc-embed>` markup and `[lumicodex_embed]` shortcodes.
* Conditional frontend loading for the CoreUI `lc-embed` bundle.
* Backward-compatible loading for legacy `lumicodex-*` components and `[lumicodex_generic_media_view]`.

The editor picker uses the same browser localStorage authentication as the admin panel. Sign in from the LumiCodex admin page first, then open a page or post and use the LumiCodex albums sidebar.

== License Scope ==

The WordPress plugin integration code is licensed under GPL-2.0-or-later.

LumiCodex service APIs, hosted applications, and CDN web components are separate LumiCodex products. They are not licensed under GPL-2.0-or-later unless explicitly stated by LumiCodex.

See `LICENSES.md` for the file-level licensing inventory.

== External Services ==

This plugin connects to LumiCodex services to authenticate users, list albums, upload/manage media, publish albums, and load frontend web components used to render LumiCodex embeds.

The final production URLs should be configured in `lumicodex-advanced.php` before release:

* `LCA_LUMICODEX_SITE_URL`
* `LCA_LUMICODEX_TERMS_URL`
* `LCA_LUMICODEX_PRIVACY_URL`
* `LCA_LUMICODEX_ADMIN_APP_URL`
* `LCA_ADMIN_APP_SCRIPT_URL`
* `LCA_ADMIN_APP_STYLE_URL`
* `LCA_API_BASE_URL`
* `LCA_COREUI_BASE_URL`
* `LCA_LEGACY_BASE_URL`
* `LCA_ADMIN_FONT_INTER_URL`
* `LCA_ADMIN_MATERIAL_SYMBOLS_URL`

== Shortcodes ==

Modern album embed:

`[lumicodex_embed account_id="ACCOUNT_ID" container_id="CONTAINER_ID"]`

Equivalent raw web component:

`<lc-embed account-id="ACCOUNT_ID" container-id="CONTAINER_ID"></lc-embed>`

Legacy media view:

`[lumicodex_generic_media_view account_id="ACCOUNT_ID" container_id="CONTAINER_ID"]`

== Developer Filters ==

Use `lca_should_enqueue_lc_embed` or `lca_should_enqueue_legacy` to force-load assets when embeds are rendered outside normal post content.

Use `lca_api_base_url`, `lca_coreui_base_url`, and `lca_legacy_base_url` to override service and CDN URLs.

Use `lca_lumicodex_admin_app_url`, `lca_admin_app_script_url`, `lca_admin_app_style_url`, `lca_lumicodex_terms_url`, `lca_lumicodex_privacy_url`, `lca_admin_font_inter_url`, and `lca_admin_material_symbols_url` to override related external links.

== Changelog ==

= 1.0.1 =
* Point the WordPress admin link to the hosted LumiCodex admin application.

= 1.0.0 =
* Add LumiCodex admin menu page.
* Add block editor picker for published albums.
* Add modern `lc-embed` and legacy LumiCodex frontend compatibility.
