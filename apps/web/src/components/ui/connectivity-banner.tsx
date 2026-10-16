'use client';

import { CloudOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineState() {
  return navigator.onLine;
}

function getServerState() {
  return true;
}

export function ConnectivityBanner() {
  const online = useSyncExternalStore(subscribe, getOnlineState, getServerState);
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-[60] border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900"
    >
      <div className="container-shell flex min-h-6 items-center justify-center gap-2 text-center">
        <CloudOff className="size-4 shrink-0" />
        <span>Đang mất kết nối. Các ô đang nhập vẫn được giữ trên màn hình.</span>
      </div>
    </div>
  );
}
