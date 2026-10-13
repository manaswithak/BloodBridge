import mongoose from 'mongoose';
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  hospitalName: String,
  bloodGroup: String,
  urgency: String,
  distanceKm: Number,
  readAt: Date,
  acceptedAt: Date
}, { timestamps: true });
notificationSchema.index({ user: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);
