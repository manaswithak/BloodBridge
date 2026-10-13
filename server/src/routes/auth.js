import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = Router();
const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const publicUser = user => ({
  id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role,
  organizationName: user.organizationName, bloodGroup: user.bloodGroup, available: user.available,
  address: user.address, location: user.location
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, role, organizationName, bloodGroup, latitude, longitude, address } = req.body;
    if (!name || !email || !password || !phone || !['donor', 'hospital'].includes(role)) return res.status(400).json({ message: 'Please complete all required fields.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (role === 'donor' && !groups.includes(bloodGroup)) return res.status(400).json({ message: 'Select a valid blood group.' });
    if (role === 'hospital' && !organizationName?.trim()) return res.status(400).json({ message: 'Hospital or organization name is required.' });
    const lat = Number(latitude), lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ message: 'Enter valid latitude and longitude.' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({
      name, email, password: await bcrypt.hash(password, 12), phone, role, organizationName,
      bloodGroup: role === 'donor' ? bloodGroup : undefined, available: role === 'donor',
      location: { type: 'Point', coordinates: [lng, lat] }, address
    });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});
router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: (req.body.email || '').toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});
router.get('/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));
router.patch('/profile', auth, async (req, res, next) => {
  try {
    const updates = {};
    if (req.user.role === 'donor') {
      if (req.body.bloodGroup && groups.includes(req.body.bloodGroup)) updates.bloodGroup = req.body.bloodGroup;
      if (typeof req.body.available === 'boolean') updates.available = req.body.available;
    }
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.address !== undefined) updates.address = req.body.address;
    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      const lat = Number(req.body.latitude), lng = Number(req.body.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ message: 'Enter valid coordinates.' });
      updates.location = { type: 'Point', coordinates: [lng, lat] };
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user: publicUser(user) });
  } catch (e) { next(e); }
});
export default router;
