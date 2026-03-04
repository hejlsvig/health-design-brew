/**
 * i18n - Internationalization helper
 * Simple translation system for multi-language support
 */

class I18n {
    constructor() {
        this.translations = null;
        this.currentLanguage = this.getStoredLanguage() || 'da';
        this.loaded = false;
        this.loadPromise = null;
        // Don't auto-load, wait for explicit call
    }

    /**
     * Get stored language from localStorage
     */
    getStoredLanguage() {
        return localStorage.getItem('language') || null;
    }

    /**
     * Set and store language
     */
    async setLanguage(lang) {
        console.log(`[i18n] setLanguage called with: ${lang}`);

        if (!['da', 'en', 'se'].includes(lang)) {
            console.warn(`Language ${lang} not supported, defaulting to 'da'`);
            lang = 'da';
        }

        this.currentLanguage = lang;
        localStorage.setItem('language', lang);

        // Wait for translations to load if not loaded yet
        if (!this.loaded) {
            console.log('[i18n] Translations not loaded yet, loading now...');
            await this.loadTranslations();
        }

        console.log(`✓ Language set to: ${lang}`);
        console.log(`[i18n] Loaded: ${this.loaded}, Has translations: ${this.translations !== null}`);

        // Update all translated elements on page
        this.updatePageTranslations();

        // Dispatch event for components to update
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }

    /**
     * Load translations from backend
     */
    async loadTranslations() {
        // Return existing promise if already loading
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = (async () => {
            try {
                // Try to load CRM translations (relative path for any deployment)
                // Try multiple paths: same folder, /translations/ folder
                const paths = [
                    'crm-translations.json',
                    './crm-translations.json',
                    '/translations/crm-translations.json',
                    '../translations/crm-translations.json'
                ];
                let loaded = false;
                for (const path of paths) {
                    try {
                        const response = await fetch(path);
                        if (response.ok) {
                            this.translations = await response.json();
                            this.loaded = true;
                            loaded = true;
                            console.log(`✓ Translations loaded from: ${path}`);
                            break;
                        }
                    } catch (e) { /* try next path */ }
                }
                if (!loaded) {
                    throw new Error('No translation file found');
                }
            } catch (error) {
                console.error('Failed to load translations:', error);
                // Fallback to empty translations
                this.translations = { da: {}, en: {}, se: {} };
                this.loaded = true;
            }
        })();

        return this.loadPromise;
    }

    /**
     * Get translation by key path (e.g., 'auth.login')
     */
    t(keyPath, replacements = {}) {
        if (!this.translations) {
            return keyPath;
        }

        const keys = keyPath.split('.');
        let value = this.translations[this.currentLanguage];

        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key];
            } else {
                console.warn(`Translation key not found: ${keyPath}`);
                return keyPath;
            }
        }

        // Replace placeholders like {name} with actual values
        if (typeof value === 'string' && Object.keys(replacements).length > 0) {
            Object.keys(replacements).forEach(key => {
                value = value.replace(new RegExp(`{${key}}`, 'g'), replacements[key]);
            });
        }

        return value || keyPath;
    }

    /**
     * Update all elements with data-i18n attribute
     */
    updatePageTranslations() {
        if (!this.loaded || !this.translations) {
            console.warn('Translations not loaded yet, skipping update');
            return;
        }

        let updatedCount = 0;

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            // Skip if translation is same as key (not found)
            if (translation === key) return;

            // Update text content or placeholder
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = translation;
                    updatedCount++;
                }
            } else {
                element.textContent = translation;
                updatedCount++;
            }
        });

        // Update elements with data-i18n-html (for HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const translation = this.t(key);
            if (translation !== key) {
                element.innerHTML = translation;
                updatedCount++;
            }
        });

        console.log(`✓ Updated ${updatedCount} translations on page`);
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return [
            { code: 'da', name: 'Dansk', flag: '🇩🇰' },
            { code: 'en', name: 'English', flag: '🇬🇧' },
            { code: 'se', name: 'Svenska', flag: '🇸🇪' }
        ];
    }
}

// Create global instance
const i18n = new I18n();
window.i18n = i18n;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    i18n.updatePageTranslations();
});

// Helper function for quick access
function t(key, replacements) {
    return i18n.t(key, replacements);
}

// Global helper to update all i18n elements (for backward compatibility)
function updateI18nElements() {
    if (window.i18n) {
        window.i18n.updatePageTranslations();
    }
}
