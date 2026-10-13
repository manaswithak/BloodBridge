import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, required: true, trim: true },
  role: { type: String, enum: ['donor', 'hospital'], required: true },
  organizationName: { type: String, trim: true, maxlength: 140 },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  available: { type: Boolean, default: false },
  location: { type: pointSchema, default: () => ({ type: 'Point', coordinates: [0, 0] }) },
  address: { type: String, trim: true, maxlength: 250 },
  lastDonationAt: { type: Date },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, bloodGroup: 1, available: 1 });
export default mongoose.model('User', userSchema);
