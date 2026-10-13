import { Router } from 'express';
import Notification from '../models/Notification.js';
import { auth } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import { webpush } from '../utils/webPush.js';
const router = Router();
router.use(auth);
router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ notifications: notifications.map(n => ({
      id: n._id, requestId: n.request, title: n.title, message: n.message, hospitalName: n.hospitalName,
      bloodGroup: n.bloodGroup, urgency: n.urgency, distanceKm: n.distanceKm, read: Boolean(n.readAt),
      accepted: Boolean(n.acceptedAt), createdAt: n.createdAt
    })) });
  } catch (e) { next(e); }
});
router.patch('/:id/read', async (req, res, next) => {
  try {
    await Notification.updateOne({ _id: req.params.id, user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/subscribe', async (req, res, next) => {
  try {
    const subscription = req.body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: 'Invalid push subscription' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        user: req.user._id,
        endpoint: subscription.endpoint,
        subscription
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({ ok: true, message: 'Push subscription saved' });
  } catch (e) {
    next(e);
  }
});
export default router;
