/**
 * CRM Icon Configuration
 * =====================
 * Central konfiguration for ALLE ikoner i CRM-systemet.
 * Skift ikon-navne her for at opdatere ikoner p\u00e5 ALLE sider.
 *
 * Bruger Lucide Icons: https://lucide.dev/icons/
 *
 * Brug:  window.getIcon('send')  =>  '<i data-lucide="send"></i>'
 */

window.CRM_ICONS = {
    // ── Navigation & Sider ──
    dashboard:    'layout-dashboard',
    settings:     'settings',
    users:        'users',
    emailAuto:    'mail',
    emailStats:   'bar-chart-3',
    layoutDesign: 'palette',

    // ── Tabs ──
    overview:     'bar-chart-3',
    mealPlans:    'utensils',
    checkins:     'trending-up',
    emailHistory: 'mail',
    notes:        'notebook-pen',

    // ── Handlinger ──
    send:         'send',
    save:         'save',
    delete:       'trash-2',
    download:     'download',
    upload:       'upload',
    edit:         'pencil',
    generate:     'sparkles',
    copy:         'copy',
    viewProfile:  'user',
    viewCheckins: 'clipboard-list',
    newCheckin:   'plus-circle',
    assign:       'user-plus',
    activate:     'rocket',

    // ── Data & Info ──
    calendar:     'calendar',
    aiModel:      'bot',
    cost:         'coins',
    lightbulb:    'lightbulb',
    star:         'star',
    zap:          'zap',
    trophy:       'trophy',
    brain:        'brain',
    hand:         'hand',
    info:         'info',

    // ── UI ──
    eye:          'eye',
    eyeOff:       'eye-off',
    list:         'list',
    layoutGrid:   'layout-grid',

    // ── Status ──
    success:      'check-circle',
    error:        'x-circle',
    warning:      'alert-triangle',
    loading:      'loader',
};

/**
 * Returner Lucide icon HTML for et givet ikon-navn.
 * @param {string} name - Ikon-n\u00f8gle fra CRM_ICONS
 * @param {string} [extraClass] - Valgfri CSS-klasse
 * @returns {string} HTML string med <i data-lucide="..."> tag
 */
window.getIcon = function(name, extraClass) {
    const iconName = window.CRM_ICONS[name];
    if (!iconName) return '';
    const cls = extraClass ? ` class="${extraClass}"` : '';
    return `<i data-lucide="${iconName}"${cls}></i>`;
};
