import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy, query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils/formatters';
import type { BannerModel, OfferModel } from '@/lib/types';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

type Tab = 'banners' | 'offers' | 'offer_banners';

// ── Banners ──────────────────────────────────────────────────────────────────
function BannersTab() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, COLLECTIONS.banners), orderBy('priority', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as BannerModel));
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateDoc(doc(db, COLLECTIONS.banners, id), { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
  });

  const deleteBanner = useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, COLLECTIONS.banners, id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
  });

  const filtered = data.filter(b => !search || b.title?.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<BannerModel>[] = [
    {
      key: 'preview', header: 'Banner',
      render: b => (
        <div className="flex items-center gap-3">
          {b.imageUrl ? (
            <img src={b.imageUrl} alt={b.title} className="h-10 w-16 rounded object-cover" />
          ) : (
            <div className="h-10 w-16 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">No img</div>
          )}
          <p className="font-medium text-sm text-gray-900">{b.title ?? '—'}</p>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: b => <span className="text-xs text-gray-600">{b.priority ?? 0}</span> },
    { key: 'expiry', header: 'Expiry', render: b => <span className="text-xs text-gray-500">{formatDate(b.expiryDate)}</span> },
    {
      key: 'active', header: 'Active',
      render: b => (
        <button onClick={() => toggleActive.mutate({ id: b.id, isActive: b.isActive ?? false })}
          className={`text-sm ${b.isActive ? 'text-green-600' : 'text-gray-400'}`}>
          {b.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
        </button>
      ),
    },
    {
      key: 'actions', header: '',
      render: b => (
        <button onClick={() => { if (confirm('Delete banner?')) deleteBanner.mutate(b.id); }}
          className="rounded p-1 text-red-400 hover:bg-red-50 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <DataTable data={filtered} columns={columns} loading={isLoading}
      searchPlaceholder="Search banners..." onSearch={setSearch} searchValue={search}
      rowKey={b => b.id} emptyText="No banners found" />
  );
}

// ── Offers / Promo Codes ──────────────────────────────────────────────────────
function OffersTab() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', discount: '', minBookingAmount: '' });
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, COLLECTIONS.offers));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as OfferModel));
    },
  });

  const createOffer = useMutation({
    mutationFn: () => addDoc(collection(db, COLLECTIONS.offers), {
      code: form.code.toUpperCase(),
      discount: Number(form.discount),
      minBookingAmount: Number(form.minBookingAmount),
      isActive: true,
      createdAt: serverTimestamp(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['offers'] }); setShowForm(false); setForm({ code: '', discount: '', minBookingAmount: '' }); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateDoc(doc(db, COLLECTIONS.offers, id), { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  });

  const deleteOffer = useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, COLLECTIONS.offers, id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  });

  const filtered = data.filter(o => !search || o.code?.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<OfferModel>[] = [
    { key: 'code', header: 'Code', render: o => <span className="font-mono font-bold text-indigo-700">{o.code ?? '—'}</span> },
    { key: 'discount', header: 'Discount', render: o => <span className="text-sm font-semibold text-green-700">{o.discount ?? 0}%</span> },
    { key: 'min', header: 'Min Booking', render: o => <span className="text-xs text-gray-600">₹{o.minBookingAmount ?? 0}</span> },
    { key: 'expiry', header: 'Expiry', render: o => <span className="text-xs text-gray-500">{formatDate(o.expiryDate)}</span> },
    {
      key: 'active', header: 'Active',
      render: o => (
        <button onClick={() => toggleActive.mutate({ id: o.id, isActive: o.isActive ?? false })}
          className={o.isActive ? 'text-green-600' : 'text-gray-400'}>
          {o.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
        </button>
      ),
    },
    {
      key: 'actions', header: '',
      render: o => (
        <button onClick={() => { if (confirm('Delete offer?')) deleteOffer.mutate(o.id); }}
          className="rounded p-1 text-red-400 hover:bg-red-50 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {showForm && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-800 mb-3">New Promo Code</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Code', key: 'code', placeholder: 'SAVE20' },
              { label: 'Discount %', key: 'discount', placeholder: '20' },
              { label: 'Min Booking (₹)', key: 'minBookingAmount', placeholder: '200' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => createOffer.mutate()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
              Create
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
      <DataTable data={filtered} columns={columns} loading={isLoading}
        searchPlaceholder="Search promo codes..." onSearch={setSearch} searchValue={search}
        rowKey={o => o.id} emptyText="No offers found"
        actions={
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Promo
          </button>
        }
      />
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
export function ContentShell() {
  const [tab, setTab] = useState<Tab>('banners');
  const TABS: { key: Tab; label: string }[] = [
    { key: 'banners', label: 'Banners' },
    { key: 'offers', label: 'Promo Codes' },
    { key: 'offer_banners', label: 'Offer Banners' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${tab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'banners' && <BannersTab />}
      {tab === 'offers' && <OffersTab />}
      {tab === 'offer_banners' && <p className="text-sm text-gray-400 py-4">Offer banners management — same pattern as banners.</p>}
    </div>
  );
}
