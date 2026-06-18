import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatDateTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { AdminNotification, NotificationTarget } from '@/lib/types';
import { Send, Clock, CheckCircle, XCircle, Trash2, Bell, Users, Tag, Smartphone, Copy, ChevronRight, Loader2 } from 'lucide-react';

// ── Built-in templates ────────────────────────────────────────────────────────
const BUILT_IN_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome',
    icon: '👋',
    title: 'Welcome to Zyppi! 🎉',
    body: 'Thanks for joining. Book your first ride and enjoy a special welcome discount. Tap to explore the app.',
    target: 'all' as NotificationTarget,
  },
  {
    id: 'promo',
    name: 'Promo Offer',
    icon: '🎁',
    title: 'Limited offer inside 🎁',
    body: 'Use code SAVE20 to get 20% off your next ride. Valid this weekend only. Don\'t miss out!',
    target: 'all' as NotificationTarget,
  },
  {
    id: 'safety',
    name: 'Safety Reminder',
    icon: '🛡️',
    title: 'Your safety matters 🛡️',
    body: 'Always verify your driver\'s photo and vehicle number before boarding. Use the SOS button if you feel unsafe.',
    target: 'all' as NotificationTarget,
  },
  {
    id: 'update',
    name: 'App Update',
    icon: '✨',
    title: 'Zyppi just got better ✨',
    body: 'Update the app now to enjoy faster booking, new payment options and a smoother ride experience.',
    target: 'all' as NotificationTarget,
  },
  {
    id: 'driver_tip',
    name: 'Driver Tips',
    icon: '💡',
    title: 'Tips to earn more 💡',
    body: 'Go online during peak hours (7–10 AM, 5–9 PM) to get more ride requests and higher earnings.',
    target: 'topic' as NotificationTarget,
    topic: 'drivers',
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    icon: '🔧',
    title: 'Scheduled maintenance tonight 🔧',
    body: 'Zyppi services will be briefly unavailable from 2–3 AM tonight for upgrades. We apologize for any inconvenience.',
    target: 'all' as NotificationTarget,
  },
];

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AdminNotification['status'] }) {
  const map = {
    queued:  { label: 'Queued',  cls: 'bg-amber-100 text-amber-700',  Icon: Clock },
    sending: { label: 'Sending', cls: 'bg-blue-100 text-blue-700',    Icon: Send },
    sent:    { label: 'Sent',    cls: 'bg-green-100 text-green-700',   Icon: CheckCircle },
    failed:  { label: 'Failed',  cls: 'bg-red-100 text-red-700',      Icon: XCircle },
  };
  const { label, cls, Icon } = map[status] ?? map.queued;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', cls)}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

// ── Android notification preview ──────────────────────────────────────────────
function PhonePreview({ title, body, imageUrl }: { title: string; body: string; imageUrl?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Android Preview</p>
      <div className="w-64 rounded-3xl bg-gray-900 p-3 shadow-2xl">
        {/* Status bar */}
        <div className="flex justify-between items-center px-2 mb-3">
          <span className="text-[10px] text-white/60">9:41</span>
          <div className="flex gap-1">
            <div className="h-1.5 w-4 rounded-full bg-white/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
          </div>
        </div>
        {/* Notification card */}
        <div className="rounded-2xl bg-white/10 backdrop-blur p-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-6 w-6 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <Bell className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] font-semibold text-white truncate">ZYPPI</p>
                <p className="text-[10px] text-white/40 shrink-0">now</p>
              </div>
              <p className="text-xs font-medium text-white mt-0.5 leading-tight">
                {title || 'Notification title'}
              </p>
              <p className="text-[11px] text-white/70 mt-0.5 leading-tight line-clamp-2">
                {body || 'Notification body text will appear here.'}
              </p>
              {imageUrl && (
                <img src={imageUrl} alt="" className="mt-2 w-full rounded-lg object-cover h-20" />
              )}
            </div>
          </div>
        </div>
        {/* Home bar */}
        <div className="mt-3 flex justify-center">
          <div className="h-1 w-16 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

// ── Compose tab ───────────────────────────────────────────────────────────────
function ComposeTab() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [target, setTarget] = useState<NotificationTarget>('all');
  const [topic, setTopic] = useState('all_users');
  const [token, setToken] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [dataFields, setDataFields] = useState<{ key: string; value: string }[]>([]);
  const [sendMsg, setSendMsg] = useState('');

  const sendNotification = useMutation({
    mutationFn: () => addDoc(collection(db, COLLECTIONS.adminNotifications), {
      title: title.trim(),
      body: body.trim(),
      imageUrl: imageUrl.trim() || null,
      target,
      topic: target === 'topic' ? topic.trim() : null,
      token: target === 'token' ? token.trim() : null,
      targetUserName: target === 'token' ? targetUserName.trim() : null,
      data: dataFields.length > 0
        ? Object.fromEntries(dataFields.filter(f => f.key).map(f => [f.key, f.value]))
        : null,
      status: 'queued',
      createdAt: serverTimestamp(),
      createdBy: user?.uid ?? 'unknown',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      setSendMsg('✅ Queued successfully — Cloud Function will deliver shortly');
      setTimeout(() => setSendMsg(''), 4000);
    },
    onError: (err: any) => {
      setSendMsg(`❌ ${err?.message ?? 'Failed to queue — check Firestore rules'}`);
      setTimeout(() => setSendMsg(''), 5000);
    },
  });

  function applyTemplate(t: typeof BUILT_IN_TEMPLATES[0]) {
    setTitle(t.title);
    setBody(t.body);
    setTarget(t.target);
    if (t.topic) setTopic(t.topic);
    setImageUrl('');
  }

  const canSend = title.trim() && body.trim() &&
    (target !== 'topic' || topic.trim()) &&
    (target !== 'token' || token.trim());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
      <div className="space-y-6">
        {/* Cloud Function warning */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3">
          <Bell className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 leading-relaxed">
            <strong>How sending works:</strong> clicking Send writes the notification to Firestore with status <em>Queued</em>.
            A Cloud Function (see <strong>Setup</strong> tab) picks it up and delivers it via FCM.
            Without the function, messages stay queued but are not delivered to devices.
          </div>
        </div>

        {/* Templates */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Quick Templates</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {BUILT_IN_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-3 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-[10px] font-medium text-gray-600 group-hover:text-indigo-700 leading-tight">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Limited offer inside 🎁"
              maxLength={100}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">{title.length}/100</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
              Body <span className="text-red-400">*</span>
            </label>
            <textarea
              value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write the notification message here..."
              maxLength={300}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 resize-none"
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">{body.length}/300</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
              Image URL <span className="text-gray-400 font-normal">(optional — shown in expanded notification)</span>
            </label>
            <input
              value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="https://zyppi.in/assets/promo-banner.jpg"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Target */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
              Send To <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'all',   label: 'All Users',   icon: Users,       desc: 'Everyone with the app' },
                { value: 'topic', label: 'Topic',       icon: Tag,         desc: 'Subscribed group' },
                { value: 'token', label: 'One Device',  icon: Smartphone,  desc: 'Specific FCM token' },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setTarget(value)}
                  className={cn(
                    'flex flex-col gap-1 rounded-xl border p-3 text-left transition-all',
                    target === value
                      ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  )}
                >
                  <Icon className={cn('h-4 w-4', target === value ? 'text-indigo-600' : 'text-gray-400')} />
                  <p className={cn('text-xs font-semibold', target === value ? 'text-indigo-700' : 'text-gray-700')}>{label}</p>
                  <p className="text-[10px] text-gray-400">{desc}</p>
                </button>
              ))}
            </div>

            {target === 'topic' && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 block mb-1">Topic name (users must be subscribed client-side)</label>
                <input value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. all_users, drivers, riders"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {['all_users', 'drivers', 'riders'].map(t => (
                    <button key={t} onClick={() => setTopic(t)}
                      className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors font-mono">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {target === 'token' && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">User name / label (for your reference)</label>
                  <input value={targetUserName} onChange={e => setTargetUserName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">FCM Token (from user's Firestore document → fcmToken field)</label>
                  <textarea value={token} onChange={e => setToken(e.target.value)}
                    placeholder="Paste FCM token here..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Custom data fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Custom Data <span className="text-gray-400 font-normal">(optional key-value pairs for deep linking)</span>
              </label>
              <button onClick={() => setDataFields(f => [...f, { key: '', value: '' }])}
                className="text-[11px] text-indigo-600 hover:underline">+ Add field</button>
            </div>
            {dataFields.map((f, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input value={f.key} onChange={e => setDataFields(d => d.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                  placeholder="key (e.g. screen)"
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
                <input value={f.value} onChange={e => setDataFields(d => d.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                  placeholder="value (e.g. bookings)"
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
                <button onClick={() => setDataFields(d => d.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Send */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => sendNotification.mutate()}
            disabled={!canSend || sendNotification.isPending}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="h-4 w-4" />
            {sendNotification.isPending ? 'Queuing...' : 'Send Notification'}
          </button>
          {sendMsg && (
            <span className={`text-sm font-medium ${sendMsg.startsWith('❌') ? 'text-red-600' : 'text-green-600'}`}>
              {sendMsg}
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="shrink-0 lg:pt-[120px]">
        <PhonePreview title={title} body={body} imageUrl={imageUrl} />
      </div>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.adminNotifications), orderBy('createdAt', 'desc'))
      );
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminNotification));
    },
  });

  const [deleteMsg, setDeleteMsg] = useState('');

  const deleteNotif = useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, COLLECTIONS.adminNotifications, id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      setDeleteMsg('🗑 Record deleted');
      setTimeout(() => setDeleteMsg(''), 2500);
    },
    onError: (err: any) => {
      setDeleteMsg(`❌ ${err?.message ?? 'Failed to delete'}`);
      setTimeout(() => setDeleteMsg(''), 3000);
    },
  });

  const TARGET_LABELS: Record<string, string> = {
    all: '👥 All Users',
    topic: '🏷️ Topic',
    token: '📱 One Device',
  };

  if (isLoading) return <div className="py-12 text-center text-sm text-gray-400">Loading history...</div>;
  if (notifications.length === 0) return (
    <div className="py-16 text-center">
      <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
      <p className="text-sm text-gray-400">No notifications sent yet</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {deleteMsg && <p className="text-xs font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{deleteMsg}</p>}
      {notifications.map(n => (
        <div key={n.id} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold text-gray-900">{n.title}</p>
              <StatusBadge status={n.status} />
              {n.sentCount != null && (
                <span className="text-[11px] text-gray-500">{n.sentCount} delivered</span>
              )}
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{n.body}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-[11px] text-gray-400">{TARGET_LABELS[n.target] ?? n.target}</span>
              {n.topic && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-600">{n.topic}</span>}
              {n.targetUserName && <span className="text-[11px] text-gray-400">→ {n.targetUserName}</span>}
              <span className="text-[11px] text-gray-400">{formatDateTime(n.createdAt)}</span>
            </div>
            {n.errorMessage && (
              <p className="mt-1.5 text-[11px] text-red-600 bg-red-50 rounded-lg px-2 py-1">{n.errorMessage}</p>
            )}
          </div>
          <button
            onClick={() => { if (confirm('Delete this notification record?')) deleteNotif.mutate(n.id); }}
            disabled={deleteNotif.isPending}
            className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleteNotif.isPending ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Setup tab ─────────────────────────────────────────────────────────────────
const CF_CODE = `// functions/src/index.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendAdminNotification = onDocumentCreated(
  'adminNotifications/{id}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const n = snap.data();

    const base = {
      notification: {
        title: n.title,
        body: n.body,
        ...(n.imageUrl ? { imageUrl: n.imageUrl } : {}),
      },
      data: n.data ?? {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };

    try {
      if (n.target === 'all') {
        // Fetch all FCM tokens from users collection
        const usersSnap = await admin.firestore()
          .collection('users')
          .where('fcmToken', '!=', '')
          .get();
        const tokens = usersSnap.docs
          .map(d => d.data().fcmToken as string)
          .filter(Boolean);

        if (tokens.length === 0) {
          await snap.ref.update({ status: 'failed', errorMessage: 'No FCM tokens found' });
          return;
        }
        const result = await admin.messaging().sendEachForMulticast({ tokens, ...base });
        await snap.ref.update({
          status: 'sent',
          sentCount: result.successCount,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      } else if (n.target === 'topic') {
        await admin.messaging().send({ topic: n.topic, ...base });
        await snap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      } else if (n.target === 'token') {
        await admin.messaging().send({ token: n.token, ...base });
        await snap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (err: any) {
      await snap.ref.update({ status: 'failed', errorMessage: err.message ?? String(err) });
    }
  }
);`;

function SetupTab() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(CF_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const steps = [
    {
      n: '01',
      title: 'Enable Firebase Cloud Messaging',
      body: 'Go to Firebase Console → Project Settings → Cloud Messaging. Ensure FCM API is enabled.',
    },
    {
      n: '02',
      title: 'Add the Cloud Function',
      body: 'In your functions/ directory, paste the code below into index.ts. This function listens on the adminNotifications collection and sends FCM messages via the Admin SDK.',
    },
    {
      n: '03',
      title: 'Deploy the function',
      body: 'Run: firebase deploy --only functions:sendAdminNotification',
    },
    {
      n: '04',
      title: 'Add Firestore security rule',
      body: 'Allow authenticated admin users to write to adminNotifications:\nmatch /adminNotifications/{id} {\n  allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;\n  allow read: if request.auth != null;\n}',
    },
    {
      n: '05',
      title: 'Flutter: subscribe users to topics (optional)',
      body: 'For topic-based sends, call FirebaseMessaging.instance.subscribeToTopic(\'all_users\') in the Flutter app after login. Use \'drivers\' for driver accounts.',
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-700 leading-relaxed">
        <strong>How it works:</strong> When you click "Send Notification", the admin panel writes a document to the <code className="bg-indigo-100 px-1 rounded">adminNotifications</code> Firestore collection with status <em>queued</em>. The Cloud Function below listens for new documents and sends the actual FCM push notification, then updates status to <em>sent</em> or <em>failed</em>.
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map(s => (
          <div key={s.n} className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4">
            <span className="shrink-0 h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">{s.n}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{s.title}</p>
              <pre className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed font-sans">{s.body}</pre>
            </div>
          </div>
        ))}
      </div>

      {/* Code block */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Cloud Function Code</p>
          <button onClick={copy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
        <div className="rounded-xl bg-gray-900 overflow-auto max-h-96">
          <pre className="text-xs text-green-400 p-5 leading-relaxed font-mono whitespace-pre">{CF_CODE}</pre>
        </div>
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
type Tab = 'compose' | 'history' | 'setup';

export function NotificationsShell() {
  const [tab, setTab] = useState<Tab>('compose');

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'compose', label: 'Compose', icon: Send },
    { key: 'history', label: 'History', icon: Clock },
    { key: 'setup',   label: 'Setup Guide', icon: ChevronRight },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all',
              tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'compose' && <ComposeTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'setup'   && <SetupTab />}
    </div>
  );
}
