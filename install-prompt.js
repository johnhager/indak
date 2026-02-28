/**
 * Indak PWA Installer Component
 * Specifically designed for iOS 2026 detection and guidance.
 */

const iOSInstaller = (() => {
    const isIOS = () => {
        return [/iPad/i, /iPhone/i, /iPod/i].some(platform => navigator.userAgent.includes(platform)) ||
            (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    };

    const isStandalone = () => {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    };

    const showPrompt = () => {
        const installUI = document.getElementById('install-ui');
        if (!installUI) return;

        installUI.innerHTML = `
            <div class="glass-card" style="padding: 1.5rem; border-color: var(--accent-gold);">
                <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                    <div style="width: 48px; height: 48px; background: var(--accent-gold); border-radius: 12px; margin-right: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--bg-deep);">I</div>
                    <div>
                        <h3 style="font-size: 1.1rem; margin: 0;">Add to Home Screen</h3>
                        <p style="font-size: 0.8rem; margin: 0; opacity: 0.7;">Install Indak for the full experience.</p>
                    </div>
                </div>
                <div style="font-size: 0.9rem; border-top: 1px solid var(--glass-border); padding-top: 1rem;">
                    <p style="margin-bottom: 0.5rem;">1. Tap the <strong>Share</strong> icon <span style="display: inline-block; transform: scale(1.2);">⎙</span></p>
                    <p>2. Scroll down and select <strong>Add to Home Screen</strong></p>
                </div>
                <button onclick="document.getElementById('install-ui').classList.add('hidden')" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; opacity: 0.5; font-size: 1.2rem;">×</button>
            </div>
        `;
        installUI.classList.remove('hidden');
    };

    const init = () => {
        if (isIOS() && !isStandalone()) {
            // Show prompt after a short delay
            setTimeout(showPrompt, 2000);
        }
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', iOSInstaller.init);
