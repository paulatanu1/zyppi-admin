import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';

export const FALLBACK_LOGO = '/logo.png';

// Module-level cache + listeners so every mounted logo (sidebar, login,
// settings preview) shares one Firestore read and updates together when
// the admin saves a new logo.
let cached: string | null | undefined; // undefined = not fetched yet, null = no custom logo
const listeners = new Set<(v: string | null) => void>();

export function setBrandingLogo(v: string | null) {
  cached = v;
  listeners.forEach(l => l(v));
}

/** Returns the logo src: custom logo from settings/branding, or the bundled fallback. */
export function useBrandingLogo(): string {
  const [logo, setLogo] = useState<string | null>(cached ?? null);

  useEffect(() => {
    listeners.add(setLogo);
    if (cached === undefined) {
      cached = null; // only one fetch even with several mounts
      getDoc(doc(db, COLLECTIONS.settings, 'branding'))
        .then(snap => setBrandingLogo((snap.data()?.logoData as string) ?? null))
        .catch(() => {});
    }
    return () => { listeners.delete(setLogo); };
  }, []);

  return logo ?? FALLBACK_LOGO;
}
