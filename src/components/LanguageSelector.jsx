'use client';
import { useEffect, useState } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'mr', label: 'मराठी', full: 'Marathi' },
  { code: 'hi', label: 'हिंदी', full: 'Hindi' },
];

function selectLanguage(code) {
  const select = document.querySelector('.goog-te-combo');
  if (!select) return false;
  select.value = code;
  select.dispatchEvent(new Event('change'));
  return true;
}

// Inject CSS into <head> so it wins over inline styles
function injectHeadStyles() {
  if (document.getElementById('gt-kill-bar')) return;
  const style = document.createElement('style');
  style.id = 'gt-kill-bar';
  style.textContent = `
    .goog-te-banner-frame,
    iframe.goog-te-banner-frame,
    iframe[name="googleTranslateFrame"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      max-height: 0 !important;
      pointer-events: none !important;
    }
    .goog-te-gadget { display: none !important; }
    #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
    .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
    .VIpgJd-ZVi9od-l4eHX-hSRGPd { display: none !important; }
    body, html { top: 0px !important; margin-top: 0 !important; }
  `;
  document.head.appendChild(style);
}

export default function LanguageSelector() {
  const [active, setActive] = useState('en');
  const [ready, setReady] = useState(false);

  // Kill the Google bar — runs once on mount
  useEffect(() => {
    injectHeadStyles();

    function killBar() {
      // Remove banner iframes from the DOM entirely
      document.querySelectorAll(
        '.goog-te-banner-frame, iframe[name="googleTranslateFrame"]'
      ).forEach(el => el.parentNode?.removeChild(el));

      // Reset html and body top that Google forcibly sets via inline style
      [document.documentElement, document.body].forEach(el => {
        if (el && el.style && (el.style.top || el.style.marginTop)) {
          el.style.removeProperty('top');
          el.style.removeProperty('margin-top');
        }
      });
    }

    // Watch for Google re-injecting the iframe
    const observer = new MutationObserver(killBar);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    });

    // Also poll for 15s after load to catch delayed injection
    const interval = setInterval(killBar, 150);
    const timeout = setTimeout(() => clearInterval(interval), 15000);

    killBar();

    return () => {
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Load Google Translate widget (hidden)
  useEffect(() => {
    if (document.getElementById('google-translate-script')) {
      waitForWidget();
      return;
    }

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', includedLanguages: 'en,hi,mr', autoDisplay: false },
        'google_translate_element'
      );
      waitForWidget();
    };

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  function waitForWidget() {
    const interval = setInterval(() => {
      if (document.querySelector('.goog-te-combo')) {
        setReady(true);
        clearInterval(interval);
      }
    }, 200);
    setTimeout(() => clearInterval(interval), 10000);
  }

  function handleSelect(code) {
    if (code === 'en') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + location.hostname + ';';
      setActive('en');
      window.location.reload();
      return;
    }
    const ok = selectLanguage(code);
    if (ok) setActive(code);
  }

  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid #262626' }}>
      <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
        Language
      </div>
      <div className="flex gap-2">
        {LANGUAGES.map(({ code, label, full }) => {
          const isActive = active === code;
          return (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              title={full}
              disabled={!ready && code !== 'en'}
              className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: isActive ? 'rgba(96, 165, 250, 0.15)' : 'rgba(38, 38, 38, 0.8)',
                color: isActive ? '#60a5fa' : '#a3a3a3',
                border: isActive
                  ? '1px solid rgba(96, 165, 250, 0.4)'
                  : '1px solid rgba(64, 64, 64, 0.5)',
                opacity: !ready && code !== 'en' ? 0.5 : 1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Hidden Google Translate mount point */}
      <div id="google_translate_element" style={{ display: 'none' }} />
    </div>
  );
}
