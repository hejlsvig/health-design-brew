// Load layout settings, icon config, Lucide icons, i18n, and Supabase
(function() {
    const layoutScript = document.createElement('script');
    layoutScript.src = 'layout-loader.js';
    document.head.appendChild(layoutScript);

    // Load central icon configuration (CRM_ICONS + getIcon helper)
    const iconConfigScript = document.createElement('script');
    iconConfigScript.src = 'icon-config.js';
    document.head.appendChild(iconConfigScript);

    // Load Lucide Icons CDN
    const lucideScript = document.createElement('script');
    lucideScript.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
    lucideScript.onload = () => {
        window.lucideReady = true;
        if (window.initLucideIcons) window.initLucideIcons();
    };
    document.head.appendChild(lucideScript);

    // Load i18n.js and set a flag when it's loaded
    const i18nScript = document.createElement('script');
    i18nScript.src = 'i18n.js';
    i18nScript.onload = () => {
        console.log('[nav-loader] i18n.js loaded successfully');
        window.i18nScriptLoaded = true;
    };
    document.head.appendChild(i18nScript);

    // Load Supabase CDN + config + API adapter
    const supabaseCdn = document.createElement('script');
    supabaseCdn.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    supabaseCdn.onload = () => {
        // Load config after CDN is ready
        const configScript = document.createElement('script');
        configScript.src = 'supabase-config.js';
        configScript.onload = () => {
            // Load API adapter after config
            const apiScript = document.createElement('script');
            apiScript.src = 'supabase-api.js';
            apiScript.onload = () => {
                console.log('[nav-loader] Supabase + CRM API loaded');
                window.supabaseApiReady = true;
            };
            document.head.appendChild(apiScript);
        };
        document.head.appendChild(configScript);
    };
    document.head.appendChild(supabaseCdn);
})();

// Helper function to load nav-component.html and execute its scripts
function loadNavComponent(callback) {
    fetch('nav-component.html')
        .then(r => r.text())
        .then(html => {
            const container = document.getElementById('nav-container');

            // Parse the HTML to extract script
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Insert the HTML content (without script)
            const scripts = tempDiv.getElementsByTagName('script');
            const scriptContent = scripts.length > 0 ? scripts[0].textContent : '';

            // Remove script from HTML before inserting
            Array.from(scripts).forEach(s => s.remove());
            container.innerHTML = tempDiv.innerHTML;

            // Execute the script
            if (scriptContent) {
                const scriptEl = document.createElement('script');
                scriptEl.textContent = scriptContent;
                document.body.appendChild(scriptEl);
            }

            // Apply saved layout company name
            const saved = localStorage.getItem('crm-layout-settings');
            if (saved) {
                try {
                    const settings = JSON.parse(saved);
                    if (settings.companyName) {
                        setTimeout(() => {
                            const companyNameEl = container.querySelector('h2');
                            if (companyNameEl) {
                                companyNameEl.textContent = settings.companyName;
                            }
                        }, 100);
                    }
                } catch (e) {
                    console.error('Error applying company name:', e);
                }
            }

            // Wait for nav scripts to be executed before calling callback
            if (callback) {
                setTimeout(callback, 0);
            }
        })
        .catch(error => {
            console.error('Error loading nav-component:', error);
        });
}
