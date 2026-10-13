import mongoose from 'mongoose';
const bloodRequestSchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hospitalName: { type: String, required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  units: { type: Number, min: 1, max: 20, required: true },
  urgency: { type: String, enum: ['Routine', 'Urgent', 'Critical'], default: 'Urgent' },
  radiusKm: { type: Number, min: 1, max: 100, default: 25 },
  patientReference: { type: String, trim: true, maxlength: 80 },
  notes: { type: String, trim: true, maxlength: 1000 },
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } },
  status: { type: String, enum: ['Open', 'Partially fulfilled', 'Fulfilled', 'Cancelled'], default: 'Open' },
  acceptedBy: [{ donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, acceptedAt: { type: Date, default: Date.now }, status: { type: String, enum: ['Accepted', 'Withdrawn'], default: 'Accepted' } }]
}, { timestamps: true });
bloodRequestSchema.index({ location: '2dsphere' });
export default mongoose.model('BloodRequest', bloodRequestSchema);
