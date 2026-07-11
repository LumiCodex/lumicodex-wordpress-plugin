<?php
/**
 * Plugin Name:       LumiCodex Advanced Embed Manager
 * Plugin URI:        https://www.lumicodex.com/
 * Description:       Adds LumiCodex admin tools, an album picker for pages, and frontend support for legacy and lc-embed web components.
 * Version:           1.0.2
 * Requires at least: 5.8
 * Tested up to:      7.0
 * Requires PHP:      7.2
 * Author:            LumiCodex
 * Author URI:        https://www.lumicodex.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       lumicodex-advanced
 * Update URI:        https://www.lumicodex.com/
 *
 * License scope:
 * The WordPress plugin integration code is GPL-2.0-or-later. LumiCodex
 * service APIs, hosted applications, and CDN web components are separate
 * LumiCodex products and are not licensed
 * under GPL-2.0-or-later unless explicitly stated by LumiCodex.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('LCA_VERSION', '1.0.2');
define('LCA_LEGACY_VERSION', '0.9.5');
define('LCA_COREUI_VERSION', '1.0.0');

/*
 * License boundaries.
 *
 * LCA_PLUGIN_LICENSE applies to this WordPress integration plugin code.
 * LCA_PROPRIETARY_ASSETS_NOTICE applies to LumiCodex service code/assets that
 * are loaded by this plugin but are not part of the GPL plugin.
 */
define('LCA_PLUGIN_LICENSE', 'GPL-2.0-or-later');
define('LCA_PLUGIN_LICENSE_URI', 'https://www.gnu.org/licenses/gpl-2.0.html');
define('LCA_PROPRIETARY_ASSETS_NOTICE', 'LumiCodex service APIs, hosted applications, and CDN web components are separate LumiCodex products and are not licensed under GPL-2.0-or-later unless explicitly stated by LumiCodex.');

/*
 * External LumiCodex links.
 *
 * Replace these defaults with the final production URLs before release. They
 * are centralized here so the external service boundary is visible and easy to
 * audit. The related filters below may also override them at runtime.
 */
define('LCA_LUMICODEX_SITE_URL', 'https://www.lumicodex.com/');
define('LCA_LUMICODEX_TERMS_URL', 'https://www.lumicodex.com/terms/');
define('LCA_LUMICODEX_PRIVACY_URL', 'https://www.lumicodex.com/privacy/');
define('LCA_LUMICODEX_ADMIN_APP_URL', 'https://www.lumicodex.com/admin/index');
define('LCA_ADMIN_APP_SCRIPT_URL', '');
define('LCA_ADMIN_APP_STYLE_URL', '');
define('LCA_LEGACY_BASE_URL', 'https://fast-images-eu.lumicodex.com/lumicodex/0.9.5');
define('LCA_COREUI_BASE_URL', 'https://fast-images-eu.lumicodex.com/lumicodex/1.0.0');
define('LCA_API_BASE_URL', 'https://api.lumicodex.com/');
define('LCA_ADMIN_FONT_INTER_URL', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
define('LCA_ADMIN_MATERIAL_SYMBOLS_URL', 'https://fonts.googleapis.com/icon?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0');

$GLOBALS['lca_admin_page_hook'] = null;

function lca_register_frontend_assets() {
    wp_register_script(
        'lca-coreui',
        trailingslashit(apply_filters('lca_coreui_base_url', LCA_COREUI_BASE_URL)) . 'lumicodex.min.js',
        array(),
        apply_filters('lca_coreui_version', LCA_COREUI_VERSION),
        true
    );

    wp_register_script(
        'lca-legacy-components',
        trailingslashit(apply_filters('lca_legacy_base_url', LCA_LEGACY_BASE_URL)) . 'lumicodex.image.components.js',
        array(),
        apply_filters('lca_legacy_version', LCA_LEGACY_VERSION),
        true
    );

    wp_register_style(
        'lca-legacy-theme-black',
        trailingslashit(apply_filters('lca_legacy_base_url', LCA_LEGACY_BASE_URL)) . 'lumicodex.theme.black.css',
        array(),
        apply_filters('lca_legacy_version', LCA_LEGACY_VERSION)
    );
}
add_action('wp_enqueue_scripts', 'lca_register_frontend_assets', 5);

function lca_enqueue_coreui_assets() {
    if (!wp_script_is('lca-coreui', 'registered')) {
        lca_register_frontend_assets();
    }

    wp_enqueue_script('lca-coreui');
}

function lca_enqueue_legacy_assets() {
    if (!wp_script_is('lca-legacy-components', 'registered')) {
        lca_register_frontend_assets();
    }

    wp_enqueue_script('lca-legacy-components');
    wp_enqueue_style('lca-legacy-theme-black');
}

function lca_enqueue_detected_frontend_assets() {
    $content = lca_get_current_query_content();
    $should_enqueue_lc_embed = apply_filters('lca_should_enqueue_lc_embed', lca_content_has_lc_embed($content), $content);
    $should_enqueue_legacy = apply_filters('lca_should_enqueue_legacy', lca_content_has_legacy_embed($content), $content);

    if ($should_enqueue_lc_embed) {
        lca_enqueue_coreui_assets();
    }

    if ($should_enqueue_legacy) {
        lca_enqueue_legacy_assets();
    }
}
add_action('wp_enqueue_scripts', 'lca_enqueue_detected_frontend_assets', 20);

function lca_get_current_query_content() {
    global $post, $wp_query;

    $content = '';

    if (isset($wp_query->posts) && is_array($wp_query->posts)) {
        foreach ($wp_query->posts as $queried_post) {
            if (isset($queried_post->post_content)) {
                $content .= "\n" . $queried_post->post_content;
            }
        }
    }

    if ($post instanceof WP_Post) {
        $content .= "\n" . $post->post_content;
    }

    return $content;
}

function lca_content_has_lc_embed($content) {
    return false !== stripos($content, '<lc-embed')
        || has_shortcode($content, 'lumicodex_embed')
        || has_shortcode($content, 'lc_embed');
}

function lca_content_has_legacy_embed($content) {
    return false !== stripos($content, '<lumicodex-')
        || has_shortcode($content, 'lumicodex_generic_media_view');
}

function lca_module_script_loader_tag($tag, $handle, $src) {
    // CoreUI now ships as a self-contained IIFE bundle (lumicodex.min.js) that
    // loads as a classic script and self-registers on load, so it is
    // intentionally excluded here. Only genuine ESM bundles (the admin app)
    // need type="module".
    if (!in_array($handle, array('lca-admin-app'), true)) {
        return $tag;
    }

    $tag = preg_replace('/\s+type=(["\'])text\/javascript\1/i', '', $tag);

    return preg_replace('/^<script\b/i', '<script type="module" crossorigin="anonymous"', $tag, 1);
}
add_filter('script_loader_tag', 'lca_module_script_loader_tag', 10, 3);

function lca_normalize_shortcode_attribute_aliases($atts) {
    if (!is_array($atts)) {
        return array();
    }

    $aliases = array(
        'account-id' => 'account_id',
        'group-id' => 'group_id',
        'container-id' => 'container_id',
        'item-id' => 'item_id',
        'base-url' => 'base_url',
        'auth-token' => 'auth_token',
        'media-view' => 'media_view',
        'disable-media-view' => 'disable_media_view',
    );

    foreach ($aliases as $from => $to) {
        if (isset($atts[$from]) && !isset($atts[$to])) {
            $atts[$to] = $atts[$from];
        }
    }

    return $atts;
}

function lca_boolish_shortcode_value($value) {
    if (is_bool($value)) {
        return $value;
    }

    $normalized = strtolower(trim((string) $value));

    return in_array($normalized, array('1', 'true', 'yes', 'on'), true);
}

function lca_render_embed_shortcode($atts) {
    lca_enqueue_coreui_assets();

    $atts = shortcode_atts(
        array(
            'account_id' => '',
            'group_id' => '',
            'container_id' => '',
            'item_id' => '',
            'access' => '',
            'base_url' => '',
            'sas' => '',
            'auth_token' => '',
            'media_view' => '',
            'disable_media_view' => '',
        ),
        lca_normalize_shortcode_attribute_aliases($atts),
        'lumicodex_embed'
    );

    $attributes = array(
        'account-id' => $atts['account_id'],
        'group-id' => $atts['group_id'],
        'container-id' => $atts['container_id'],
        'item-id' => $atts['item_id'],
        'access' => $atts['access'],
        'base-url' => $atts['base_url'],
        'sas' => $atts['sas'],
        'auth-token' => $atts['auth_token'],
        'media-view' => $atts['media_view'],
    );

    $html = '<lc-embed';
    foreach ($attributes as $name => $value) {
        if ('' !== trim((string) $value)) {
            $html .= ' ' . $name . '="' . esc_attr($value) . '"';
        }
    }

    if (lca_boolish_shortcode_value($atts['disable_media_view'])) {
        $html .= ' disable-media-view';
    }

    $html .= '></lc-embed>';

    return $html;
}
add_shortcode('lumicodex_embed', 'lca_render_embed_shortcode');
add_shortcode('lc_embed', 'lca_render_embed_shortcode');

function lca_render_legacy_shortcode($atts) {
    lca_enqueue_legacy_assets();

    $atts = shortcode_atts(
        array(
            'generic_item' => 'lumicodex-row-grid',
            'grid_areas' => '',
            'account_id' => '',
            'container_id' => '',
            'image_resize' => 'true',
            'grid_item_component' => 'lumicodex-image',
            'column_count' => '3',
            'column_gap' => '10',
            'row_gap' => '10',
        ),
        $atts,
        'lumicodex_generic_media_view'
    );

    $html = '<lumicodex-generic-mediaview';
    $html .= ' generic-item="' . esc_attr($atts['generic_item']) . '"';
    $html .= ' grid-areas="' . esc_attr($atts['grid_areas']) . '"';
    $html .= ' account-id="' . esc_attr($atts['account_id']) . '"';
    $html .= ' container-id="' . esc_attr($atts['container_id']) . '"';
    $html .= ' image-resize="' . esc_attr($atts['image_resize']) . '"';
    $html .= ' grid-item-component="' . esc_attr($atts['grid_item_component']) . '"';
    $html .= ' column-count="' . esc_attr($atts['column_count']) . '"';
    $html .= ' column-gap="' . esc_attr($atts['column_gap']) . '"';
    $html .= ' row-gap="' . esc_attr($atts['row_gap']) . '"';
    $html .= '></lumicodex-generic-mediaview>';

    return $html;
}
add_shortcode('lumicodex_generic_media_view', 'lca_render_legacy_shortcode');

function lca_admin_menu() {
    $GLOBALS['lca_admin_page_hook'] = add_menu_page(
        __('LumiCodex', 'lumicodex-advanced'),
        __('LumiCodex', 'lumicodex-advanced'),
        'upload_files',
        'lumicodex-advanced',
        'lca_render_admin_page',
        'dashicons-format-gallery',
        58
    );
}
add_action('admin_menu', 'lca_admin_menu');

function lca_render_admin_page() {
    $admin_app_url = apply_filters('lca_lumicodex_admin_app_url', LCA_LUMICODEX_ADMIN_APP_URL);
    $admin_script_url = apply_filters('lca_admin_app_script_url', LCA_ADMIN_APP_SCRIPT_URL);

    echo '<div class="wrap lumicodex-admin-page">';
    echo '<h1>' . esc_html__('LumiCodex', 'lumicodex-advanced') . '</h1>';
    echo '<p class="description">' . esc_html__('Manage albums, publish them, then use the editor picker to insert embeds into pages.', 'lumicodex-advanced') . '</p>';

    if (!empty($admin_script_url)) {
        echo '<div class="lumicodex-admin-app-shell"><lc-admin-shell></lc-admin-shell></div>';
    } else {
        echo '<div class="lumicodex-admin-service-link">';
        echo '<p>' . esc_html__('The LumiCodex admin application is hosted by LumiCodex and is not bundled with this GPL plugin.', 'lumicodex-advanced') . '</p>';
        echo '<div id="lca-browser-connection"></div>';
        echo '</div>';
    }

    echo '</div>';
}

function lca_enqueue_admin_page_assets($hook_suffix) {
    if (empty($GLOBALS['lca_admin_page_hook']) || $hook_suffix !== $GLOBALS['lca_admin_page_hook']) {
        return;
    }

    $admin_style_url = apply_filters('lca_admin_app_style_url', LCA_ADMIN_APP_STYLE_URL);
    $admin_script_url = apply_filters('lca_admin_app_script_url', LCA_ADMIN_APP_SCRIPT_URL);
    lca_enqueue_browser_auth();

    wp_enqueue_style(
        'lca-admin-font-inter',
        apply_filters('lca_admin_font_inter_url', LCA_ADMIN_FONT_INTER_URL),
        array(),
        null
    );
    wp_enqueue_style(
        'lca-admin-material-symbols',
        apply_filters('lca_admin_material_symbols_url', LCA_ADMIN_MATERIAL_SYMBOLS_URL),
        array(),
        null
    );
    if (!empty($admin_style_url)) {
        wp_enqueue_style(
            'lca-admin-app',
            $admin_style_url,
            array(),
            LCA_VERSION
        );
    }

    if (!empty($admin_script_url)) {
        wp_register_script(
            'lca-admin-app',
            $admin_script_url,
            array(),
            LCA_VERSION,
            true
        );
        wp_add_inline_script('lca-admin-app', lca_lumicodex_window_config(), 'before');
        wp_enqueue_script('lca-admin-app');
    }

    wp_add_inline_style(
        !empty($admin_style_url) ? 'lca-admin-app' : 'lca-admin-font-inter',
        '.lumicodex-admin-page{max-width:none}.lumicodex-admin-app-shell{min-height:calc(100vh - 150px);background:#fff;margin-top:16px;border:1px solid #dcdcde}.lumicodex-admin-app-shell lc-admin-shell{display:block;min-height:calc(100vh - 150px)}.lumicodex-admin-service-link{max-width:680px;background:#fff;border:1px solid #dcdcde;margin-top:16px;padding:16px}'
    );
}
add_action('admin_enqueue_scripts', 'lca_enqueue_admin_page_assets');

function lca_lumicodex_window_config() {
    $api_url = trailingslashit(apply_filters('lca_api_base_url', LCA_API_BASE_URL));

    return 'window.LumiCodex = window.LumiCodex || {}; window.LumiCodex.backEndContext = window.LumiCodex.backEndContext || {}; window.LumiCodex.backEndContext.apiUrl = ' . wp_json_encode($api_url) . ';';
}

function lca_enqueue_block_editor_assets() {
    $asset_base = plugin_dir_url(__FILE__) . 'assets/editor/';

    wp_enqueue_style(
        'lca-editor-picker',
        $asset_base . 'album-picker.css',
        array(),
        LCA_VERSION
    );

    lca_enqueue_browser_auth();
    lca_enqueue_coreui_assets();
    wp_register_script(
        'lca-editor-picker',
        $asset_base . 'album-picker.js',
        array('lca-browser-auth', 'lca-coreui', 'wp-element', 'wp-components', 'wp-blocks', 'wp-block-editor', 'wp-i18n'),
        LCA_VERSION,
        true
    );
    wp_add_inline_script('lca-editor-picker', lca_lumicodex_window_config(), 'before');
    wp_localize_script(
        'lca-editor-picker',
        'LumiCodexWpAdvanced',
        array(
            'apiUrl' => trailingslashit(apply_filters('lca_api_base_url', LCA_API_BASE_URL)),
            'adminUrl' => admin_url('admin.php?page=lumicodex-advanced'),
            'serviceAdminUrl' => apply_filters('lca_lumicodex_admin_app_url', LCA_LUMICODEX_ADMIN_APP_URL),
            'termsUrl' => apply_filters('lca_lumicodex_terms_url', LCA_LUMICODEX_TERMS_URL),
            'privacyUrl' => apply_filters('lca_lumicodex_privacy_url', LCA_LUMICODEX_PRIVACY_URL),
            'authStorageKey' => 'lumicodex-admin-auth',
        )
    );
    wp_enqueue_script('lca-editor-picker');
}

function lca_browser_auth_config() {
    return array(
        'apiUrl' => trailingslashit(apply_filters('lca_api_base_url', LCA_API_BASE_URL)),
        'callbackUrl' => admin_url('admin.php?page=lumicodex-advanced'),
        'serviceAdminUrl' => apply_filters('lca_lumicodex_admin_app_url', LCA_LUMICODEX_ADMIN_APP_URL),
        'authStorageKey' => 'lumicodex-admin-auth',
    );
}

function lca_enqueue_browser_auth() {
    wp_register_script('lca-browser-auth', plugin_dir_url(__FILE__) . 'assets/editor/auth.js', array(), LCA_VERSION, true);
    wp_localize_script('lca-browser-auth', 'LumiCodexWpAdvanced', lca_browser_auth_config());
    wp_enqueue_script('lca-browser-auth');
}
add_action('enqueue_block_editor_assets', 'lca_enqueue_block_editor_assets');

function lca_allow_embed_tags_in_post_content($allowed_tags, $context) {
    if ('post' !== $context) {
        return $allowed_tags;
    }

    $lc_embed_attributes = array(
        'account-id' => true,
        'group-id' => true,
        'container-id' => true,
        'item-id' => true,
        'access' => true,
        'base-url' => true,
        'sas' => true,
        'auth-token' => true,
        'media-view' => true,
        'disable-media-view' => true,
        'class' => true,
        'style' => true,
    );

    $legacy_attributes = array(
        'generic-item' => true,
        'grid-areas' => true,
        'account-id' => true,
        'container-id' => true,
        'image-resize' => true,
        'grid-item-component' => true,
        'column-count' => true,
        'column-gap' => true,
        'row-gap' => true,
        'class' => true,
        'style' => true,
    );

    $allowed_tags['lc-embed'] = $lc_embed_attributes;
    $allowed_tags['lumicodex-generic-mediaview'] = $legacy_attributes;
    $allowed_tags['lumicodex-row-grid'] = $legacy_attributes;
    $allowed_tags['lumicodex-column-grid'] = $legacy_attributes;
    $allowed_tags['lumicodex-collage-grid'] = $legacy_attributes;
    $allowed_tags['lumicodex-square-grid'] = $legacy_attributes;
    $allowed_tags['lumicodex-compare-picture'] = $legacy_attributes;
    $allowed_tags['lumicodex-mediaview'] = $legacy_attributes;
    $allowed_tags['lumicodex-image-context'] = $legacy_attributes;
    $allowed_tags['lumicodex-image'] = $legacy_attributes;
    $allowed_tags['lumicodex-peekaboo-image'] = $legacy_attributes;
    $allowed_tags['lumicodex-kodak-frame-image'] = $legacy_attributes;
    $allowed_tags['lumicodex-polaroid-frame-image'] = $legacy_attributes;

    return $allowed_tags;
}
add_filter('wp_kses_allowed_html', 'lca_allow_embed_tags_in_post_content', 10, 2);
