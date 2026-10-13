import { Router } from 'express';
import mongoose from 'mongoose';
import BloodRequest from '../models/BloodRequest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { auth, allow } from '../middleware/auth.js';
import { donorGroupsFor } from '../utils/bloodCompatibility.js';
import { notifyUser } from '../utils/socket.js';
import PushSubscription from '../models/PushSubscription.js';
import { webpush } from '../utils/webPush.js';

const router = Router();
router.use(auth);
const requestView = (r) => ({
  id: r._id, hospitalName: r.hospitalName, bloodGroup: r.bloodGroup, units: r.units,
  urgency: r.urgency, radiusKm: r.radiusKm, patientReference: r.patientReference,
  notes: r.notes, status: r.status, createdAt: r.createdAt,
  hospital: r.hospital, acceptedBy: (r.acceptedBy || []).filter(a => a.status === 'Accepted').map(a => ({
    donorId: a.donor?._id || a.donor, name: a.donor?.name, phone: a.donor?.phone,
    bloodGroup: a.donor?.bloodGroup, acceptedAt: a.acceptedAt
  }))
});

router.post('/', allow('hospital'), async (req, res, next) => {
  try {
    const { bloodGroup, units, urgency = 'Urgent', radiusKm = 25, patientReference, notes } = req.body;
    if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) return res.status(400).json({ message: 'Choose a valid blood group.' });
    const n = Number(units), radius = Number(radiusKm);
    if (!Number.isInteger(n) || n < 1 || n > 20) return res.status(400).json({ message: 'Units must be between 1 and 20.' });
    if (!['Routine', 'Urgent', 'Critical'].includes(urgency)) return res.status(400).json({ message: 'Choose a valid urgency.' });
    if (!Number.isFinite(radius) || radius < 1 || radius > 100) return res.status(400).json({ message: 'Radius must be between 1 and 100 km.' });
    const coords = req.user.location?.coordinates || [];
    const hospitalAddress = req.user.address || 'Address not provided';
    if (coords.length !== 2) return res.status(400).json({ message: 'Set your hospital location in your profile first.' });
    const request = await BloodRequest.create({
      hospital: req.user._id, hospitalName: req.user.organizationName || req.user.name, bloodGroup, units: n, urgency,
      radiusKm: radius, patientReference, notes, location: { type: 'Point', coordinates: coords }
    });
    const donorGroups = donorGroupsFor(bloodGroup);
    const donors = await User.find({
      role: 'donor', available: true, bloodGroup: { $in: donorGroups },
      location: { $near: { $geometry: { type: 'Point', coordinates: coords }, $maxDistance: radius * 1000 } }
    }).select('_id name location bloodGroup');
    const notifications = [];
    for (const donor of donors) {
      const dx = donor.location.coordinates[0] - coords[0], dy = donor.location.coordinates[1] - coords[1];
      const distanceKm = Math.round(Math.sqrt(dx * dx + dy * dy) * 111 * 10) / 10;
      
const notification = await Notification.create({
  user: donor._id,
  request: request._id,
  title: `${urgency} blood request`,
  message: `${request.hospitalName} needs ${n} unit(s) of ${bloodGroup} blood. Location: ${hospitalAddress}`,
  hospitalName: request.hospitalName,
  bloodGroup,
  urgency,
  distanceKm
});

      notifications.push(notification);
      notifyUser(String(donor._id), { id: notification._id, requestId: request._id, title: notification.title, message: notification.message, hospitalName: request.hospitalName, bloodGroup, urgency, distanceKm, createdAt: notification.createdAt });
      
try {
  const subscriptions = await PushSubscription.find({ user: donor._id });

  for (const pushSub of subscriptions) {
    try {
      await webpush.sendNotification(
        pushSub.subscription,
        JSON.stringify({
          title: notification.title,
          body: `${notification.message} Distance: ${distanceKm} km.`,
          url: '/'
        })
      );
    } catch (pushError) {
      if (pushError.statusCode === 404 || pushError.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: pushSub._id });
      } else {
        console.error('Push notification failed:', pushError.message);
      }
    }
  }
} catch (pushError) {
  console.error('Could not load push subscriptions:', pushError.message);
}

    }
    res.status(201).json({ request: requestView(request), notifiedDonors: donors.length });
  } catch (e) { next(e); }
});

router.get('/mine', async (req, res, next) => {
  try {
    if (req.user.role === 'hospital') {
      const requests = await BloodRequest.find({ hospital: req.user._id }).populate('acceptedBy.donor', 'name phone bloodGroup').sort({ createdAt: -1 });
      return res.json({ requests: requests.map(requestView) });
    }
    const ids = await Notification.distinct('request', { user: req.user._id });
    const requests = await BloodRequest.find({ _id: { $in: ids } }).populate('acceptedBy.donor', 'name phone bloodGroup').sort({ createdAt: -1 });
    res.json({ requests: requests.map(requestView) });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id).populate('acceptedBy.donor', 'name phone bloodGroup');
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    const isHospitalOwner = req.user.role === 'hospital' && String(request.hospital) === String(req.user._id);
    const hasNotification = req.user.role === 'donor' && await Notification.exists({ user: req.user._id, request: request._id });
    if (!isHospitalOwner && !hasNotification) return res.status(403).json({ message: 'You cannot view this request.' });
    res.json({ request: requestView(request) });
  } catch (e) { next(e); }
});

router.post('/:id/accept', allow('donor'), async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    const notice = await Notification.findOne({ user: req.user._id, request: request._id });
    if (!notice) return res.status(403).json({ message: 'This request was not sent to your account.' });
    if (request.status === 'Cancelled' || request.status === 'Fulfilled') return res.status(400).json({ message: 'This request is no longer accepting donors.' });
    const already = request.acceptedBy.some(a => String(a.donor) === String(req.user._id) && a.status === 'Accepted');
    if (!already) request.acceptedBy.push({ donor: req.user._id, status: 'Accepted', acceptedAt: new Date() });
    request.status = 'Partially fulfilled';
    await request.save();
    notice.acceptedAt = new Date(); await notice.save();
    const hospitalNotice = await Notification.create({
      user: request.hospital, request: request._id, title: 'A donor has responded',
      message: `${req.user.name} is willing to help with the ${request.bloodGroup} blood request.`,
      hospitalName: request.hospitalName, bloodGroup: request.bloodGroup, urgency: request.urgency
    });
    notifyUser(String(request.hospital), { id: hospitalNotice._id, requestId: request._id, title: hospitalNotice.title, message: hospitalNotice.message, hospitalName: request.hospitalName, bloodGroup: request.bloodGroup, urgency: request.urgency, createdAt: hospitalNotice.createdAt });
    const populated = await BloodRequest.findById(request._id).populate('acceptedBy.donor', 'name phone bloodGroup');
    res.json({ message: 'Thank you for responding. The hospital has been notified.', request: requestView(populated) });
  } catch (e) { next(e); }
});

router.patch('/:id/status', allow('hospital'), async (req, res, next) => {
  try {
    if (!['Open', 'Partially fulfilled', 'Fulfilled', 'Cancelled'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid status.' });
    const request = await BloodRequest.findOne({ _id: req.params.id, hospital: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    request.status = req.body.status; await request.save();
    res.json({ request: requestView(await request.populate('acceptedBy.donor', 'name phone bloodGroup')) });
  } catch (e) { next(e); }
});
export default router;
