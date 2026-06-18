import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Fires when admin panel queues a notification in adminNotifications collection.
 * Sends FCM push notification and updates status to sent/failed.
 */
export const sendAdminNotification = onDocumentCreated(
  'adminNotifications/{id}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const n = snap.data();

    // Only process queued notifications
    if (n.status !== 'queued') return;

    // Mark as sending immediately to prevent duplicate processing
    await snap.ref.update({ status: 'sending' });

    const base: Omit<admin.messaging.Message, 'token' | 'topic' | 'condition'> = {
      notification: {
        title: n.title,
        body: n.body,
        ...(n.imageUrl ? { imageUrl: n.imageUrl } : {}),
      },
      data: n.data ?? {},
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    try {
      if (n.target === 'all') {
        // Fetch all users who have an FCM token
        const usersSnap = await db
          .collection('users')
          .where('fcmToken', '!=', '')
          .get();

        const tokens: string[] = usersSnap.docs
          .map((d) => d.data().fcmToken as string)
          .filter((t) => typeof t === 'string' && t.length > 0);

        if (tokens.length === 0) {
          await snap.ref.update({
            status: 'failed',
            errorMessage: 'No users have FCM tokens registered.',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return;
        }

        // FCM allows max 500 tokens per multicast — chunk if needed
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < tokens.length; i += 500) {
          const chunk = tokens.slice(i, i + 500);
          const result = await messaging.sendEachForMulticast({ tokens: chunk, ...base });
          successCount += result.successCount;
          failCount += result.failureCount;
        }

        await snap.ref.update({
          status: 'sent',
          sentCount: successCount,
          failCount,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      } else if (n.target === 'topic') {
        if (!n.topic) {
          await snap.ref.update({ status: 'failed', errorMessage: 'Topic name is missing.' });
          return;
        }

        await messaging.send({ topic: n.topic, ...base });
        await snap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      } else if (n.target === 'token') {
        if (!n.token) {
          await snap.ref.update({ status: 'failed', errorMessage: 'FCM token is missing.' });
          return;
        }

        await messaging.send({ token: n.token, ...base });
        await snap.ref.update({
          status: 'sent',
          sentCount: 1,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      } else {
        await snap.ref.update({ status: 'failed', errorMessage: `Unknown target: ${n.target}` });
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('FCM send failed:', message);
      await snap.ref.update({
        status: 'failed',
        errorMessage: message,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
