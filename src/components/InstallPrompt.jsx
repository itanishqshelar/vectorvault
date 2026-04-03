'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Share, Plus, Download } from 'lucide-react';

const DISMISSED_KEY = 'vv_install_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isMobile() {
  return window.innerWidth <= 768 || 'ontouchstart' in window;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState(null); // 'ios' | 'android'
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [iosPopover, setIosPopover] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (isInStandalone()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    if (!isMobile()) return;

    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');
      setShow(true);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (isIOS()) {
      const timer = setTimeout(() => {
        setPlatform('ios');
        setShow(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  // Close iOS popover on outside tap
  useEffect(() => {
    if (!iosPopover) return;
    function onClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIosPopover(false);
      }
    }
    document.addEventListener('pointerdown', onClickOutside);
    return () => document.removeEventListener('pointerdown', onClickOutside);
  }, [iosPopover]);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
    setIosPopover(false);
  }

  async function handleInstall() {
    if (platform === 'ios') {
      setIosPopover((v) => !v);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      {/* iOS popover */}
      {iosPopover && (
        <div
          ref={popoverRef}
          className="absolute bottom-full mb-3 left-4 right-4 rounded-2xl p-4 flex flex-col gap-3"
          style={{
            background: 'rgba(18,18,20,0.99)',
            border: '1px solid rgba(80,80,80,0.5)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
            Add to Home Screen
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-300">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0"
              style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
              <span className="text-blue-400 font-bold text-base">1</span>
            </div>
            <span>
              Tap the <Share className="inline w-3.5 h-3.5 text-blue-400 mx-0.5 -mt-0.5" />
              <strong className="text-white"> Share</strong> button in Safari&rsquo;s toolbar
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-300">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0"
              style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
              <span className="text-blue-400 font-bold text-base">2</span>
            </div>
            <span>
              Scroll down and tap
              <strong className="text-white"> Add to Home Screen <Plus className="inline w-3 h-3 -mt-0.5" /></strong>
            </span>
          </div>
          {/* Arrow pointing down */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
            style={{
              background: 'rgba(18,18,20,0.99)',
              border: '1px solid rgba(80,80,80,0.5)',
              borderTop: 'none',
              borderLeft: 'none',
            }}
          />
        </div>
      )}

      {/* Banner */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(18,18,20,0.97)',
          border: '1px solid rgba(64,64,64,0.5)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
          style={{ border: '1px solid rgba(64,64,64,0.4)' }}>
          <Image src="/vaultlogo.jpeg" alt="VectorVault" width={40} height={40} className="object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm leading-tight">VectorVault</div>
          <div className="text-neutral-500 text-xs mt-0.5">Add to Home Screen</div>
        </div>

        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 flex-shrink-0 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            boxShadow: '0 2px 12px rgba(59,130,246,0.35)',
          }}
        >
          {platform === 'android'
            ? <><Download className="w-3.5 h-3.5" /> Install</>
            : <><Plus className="w-3.5 h-3.5" /> Add</>
          }
        </button>

        <button
          onClick={dismiss}
          className="text-neutral-600 hover:text-neutral-400 transition-colors flex-shrink-0 cursor-pointer"
          style={{ border: 'none', background: 'none', padding: '4px' }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
