import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { ContactCategory } from '@/lib/types';
import { Loader2, Send, CheckCircle } from 'lucide-react';

const CATEGORIES: ContactCategory[] = ['Ride issue', 'Payment', 'Partnership', 'Other'];

const EMPTY_FORM = { name: '', email: '', phone: '', category: '', subject: '', message: '' };

export function ContactForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  function validate(): string {
    if (!form.name.trim()) return 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email address.';
    if (!form.category) return 'Please choose a topic.';
    if (!form.subject.trim()) return 'Please enter a subject.';
    if (!form.message.trim()) return 'Please enter your message.';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.contact), {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
      });
      setForm(EMPTY_FORM);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
        <h2 className="mt-3 text-lg font-bold text-gray-900">Message sent!</h2>
        <p className="mt-1 text-sm text-gray-600">Thanks for reaching out — our team will get back to you soon.</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Send another message
        </button>
      </div>
    );
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
          <input value={form.name} onChange={set('name')} placeholder="Your full name" className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Phone (optional)</label>
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Topic *</label>
          <select value={form.category} onChange={set('category')} className={inputClass}>
            <option value="" disabled>Select a topic</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Subject *</label>
        <input value={form.subject} onChange={set('subject')} placeholder="How can we help?" className={inputClass} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Message *</label>
        <textarea value={form.message} onChange={set('message')} rows={5}
          placeholder="Tell us more about your question or issue..." className={inputClass} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
      )}

      <button type="submit" disabled={submitting}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
