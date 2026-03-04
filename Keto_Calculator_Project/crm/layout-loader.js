// Load and apply saved layout settings
(function() {
    const saved = localStorage.getItem('crm-layout-settings');
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);

        // Apply company name to nav
        window.addEventListener('DOMContentLoaded', () => {
            const companyName = document.querySelector('#nav-container h2');
            if (companyName && settings.companyName) {
                companyName.textContent = settings.companyName;
            }
        });

        // Create CSS variables style
        const style = document.createElement('style');
        style.id = 'layout-custom-styles';

        let css = ':root {';

        if (settings.primaryColor) {
            css += `--primary-color: ${settings.primaryColor};`;
        }

        if (settings.secondaryColor) {
            css += `--secondary-color: ${settings.secondaryColor};`;
        }

        css += '}';

        // Apply primary color overrides
        if (settings.primaryColor) {
            css += `
                .btn-primary, .btn-create, .btn-save, button[class*="btn-"][style*="667eea"] {
                    background: ${settings.primaryColor} !important;
                }
                a[style*="667eea"], .tab-button.active {
                    color: ${settings.primaryColor} !important;
                    border-color: ${settings.primaryColor} !important;
                }
                .template-card.active, .template-card:hover {
                    border-color: ${settings.primaryColor} !important;
                }
                .stat-card.active {
                    border-color: ${settings.primaryColor} !important;
                }
            `;
        }

        // Apply font family
        if (settings.fontFamily && settings.fontFamily !== 'system') {
            const fontMap = {
                'inter': 'Inter, sans-serif',
                'roboto': 'Roboto, sans-serif',
                'open-sans': '"Open Sans", sans-serif'
            };

            if (fontMap[settings.fontFamily]) {
                css += `
                    body {
                        font-family: ${fontMap[settings.fontFamily]}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                    }
                `;
            }
        }

        style.textContent = css;
        document.head.appendChild(style);

    } catch (error) {
        console.error('Error applying layout settings:', error);
    }
})();
