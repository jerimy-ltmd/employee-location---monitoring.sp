import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { Button } from '../ui/Button';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone app, suppress prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <Button
        variant="gold"
        size="sm"
        onClick={install}
        className="flex items-center gap-1.5 font-medium text-xs px-2.5 py-1.5 h-8"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </Button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 h-8 border-amber-500/40 text-amber-600 dark:text-amber-400"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Install PWA</span>
        </Button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl border border-border text-foreground">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Install on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-center gap-3 bg-muted/60 p-2.5 rounded-lg border border-border">
                  <Share2 className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>
                    1. Tap the <strong>Share</strong> button in Safari’s navigation bar.
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-muted/60 p-2.5 rounded-lg border border-border">
                  <PlusSquare className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/80 italic text-center">
                  StaffMonitor operates as a standalone progressive web app with zero store installation needed.
                </p>
              </div>
              <Button
                variant="default"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full"
              >
                Got It
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
