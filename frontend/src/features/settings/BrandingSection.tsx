import React, { useRef, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useBrandingLogo, setBrandingLogo, FALLBACK_LOGO } from '@/lib/hooks/useBranding';
import { Loader2, Upload } from 'lucide-react';

const MAX_DIMENSION = 512;
const MAX_DATA_SIZE = 900_000; // keep well under the 1 MiB Firestore document limit

/** Downscale the picked image to a compact PNG data URL. */
function fileToLogoData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image file')); };
    img.src = url;
  });
}

export function BrandingSection() {
  const currentLogo = useBrandingLogo();
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await fileToLogoData(file);
      if (data.length > MAX_DATA_SIZE) {
        flash('❌ Image is too large even after resizing — please use a simpler/smaller logo.');
        return;
      }
      setPreview(data);
    } catch (err: any) {
      flash(`❌ ${err?.message ?? 'Could not read that image'}`);
    } finally {
      e.target.value = '';
    }
  }

  async function save() {
    if (!preview) return;
    setSaving(true);
    try {
      await setDoc(doc(db, COLLECTIONS.settings, 'branding'), {
        logoData: preview,
        updatedAt: serverTimestamp(),
      });
      setBrandingLogo(preview); // sidebar/login pick it up immediately
      setPreview(null);
      flash('✅ Logo updated — the website and admin panel now use the new logo.');
    } catch (err: any) {
      flash(`❌ ${err?.message ?? 'Failed to save logo'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="pt-2 pb-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Branding</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          The logo is stored in Firestore (settings/branding) and shown on the website header, footer, favicon and this admin panel.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-2">
              <img src={currentLogo} alt="Current logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-[10px] text-gray-400">Current{currentLogo === FALLBACK_LOGO ? ' (default)' : ''}</span>
          </div>

          {preview && (
            <>
              <span className="text-gray-300">→</span>
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-indigo-300 bg-indigo-50 p-2">
                  <img src={preview} alt="New logo preview" className="h-full w-full object-contain" />
                </div>
                <span className="text-[10px] text-indigo-500 font-medium">New</span>
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              Choose Image
            </button>
            {preview && (
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? 'Saving...' : 'Save Logo'}
              </button>
            )}
          </div>
        </div>
        {msg && <p className="mt-3 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{msg}</p>}
        <p className="mt-3 text-[11px] text-gray-400 italic">
          PNG with transparency recommended. The image is downscaled to {MAX_DIMENSION}px and saved as one Firestore document (1 read per visitor page load).
        </p>
      </div>
    </div>
  );
}
