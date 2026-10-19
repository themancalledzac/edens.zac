'use client';

import { useSyncExternalStore } from 'react';

const PHONE_QUERY = '(width < 768px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(PHONE_QUERY);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia?.(PHONE_QUERY).matches ?? false;
}

/** True under 768px, the width where the menu becomes a bottom sheet. False on the server. */
export function useIsPhone() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
