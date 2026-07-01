# Licensing Inventory

This file documents the licensing boundary for the LumiCodex Advanced Embed
Manager package.

## GPL-2.0-or-later

The following files are part of the WordPress plugin integration and are
licensed under GPL-2.0-or-later:

- `lumicodex-advanced.php`
- `readme.txt`
- `assets/editor/album-picker.js`
- `assets/editor/album-picker.css`

The full license text is in `LICENSE`.

## LumiCodex Proprietary Assets

No LumiCodex proprietary admin bundle is included in this package.

LumiCodex service APIs, hosted applications, and CDN web components are separate
LumiCodex products and are not licensed under GPL-2.0-or-later unless explicitly
stated by LumiCodex.

## External LumiCodex Services

The plugin may connect to LumiCodex-hosted services and CDNs. The canonical
URLs are centralized as constants in `lumicodex-advanced.php`:

- `LCA_LUMICODEX_SITE_URL`
- `LCA_LUMICODEX_TERMS_URL`
- `LCA_LUMICODEX_PRIVACY_URL`
- `LCA_LUMICODEX_ADMIN_APP_URL`
- `LCA_ADMIN_APP_SCRIPT_URL`
- `LCA_ADMIN_APP_STYLE_URL`
- `LCA_API_BASE_URL`
- `LCA_COREUI_BASE_URL`
- `LCA_LEGACY_BASE_URL`

Replace the placeholder/default values with the final production URLs before
release.

## External Fonts

The admin interface currently references externally hosted Google Fonts assets
through these constants:

- `LCA_ADMIN_FONT_INTER_URL`
- `LCA_ADMIN_MATERIAL_SYMBOLS_URL`

These assets are provided by their respective owners and are subject to their
own licenses and terms.
