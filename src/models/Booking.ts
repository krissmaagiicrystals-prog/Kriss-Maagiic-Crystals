import mongoose, { Schema, models, model, Model } from 'mongoose';

export type BookingStatus = 'pending' | 'approved' | 'booked' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';

export interface BookingDoc {
  _id: mongoose.Types.ObjectId;
  bookingNumber: string;
  user: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  serviceTitle: string;
  servicePrice: number;
  date: string; // YYYY-MM-DD or "N/A"
  timeSlot: string; // e.g. "14:00" or "N/A"
  question?: string;
  intention?: string;
  dob?: string;
  notes?: string;
  status: BookingStatus;
  adminNote?: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  razorpayOrderId?: string;   // legacy — kept for existing records
  razorpayPaymentId?: string; // legacy — kept for existing records
  cfOrderId?: string;
  cfPaymentId?: string;
  currency?: string;
  inrAmount?: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<BookingDoc>(
  {
    bookingNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    serviceTitle: { type: String, required: true },
    servicePrice: { type: Number, required: true },
    currency: { type: String, default: 'INR', index: true },
    inrAmount: { type: Number },
    date: { type: String, default: 'N/A', index: true },
    timeSlot: { type: String, default: 'N/A' },
    question: { type: String, default: '' },
    intention: { type: String, default: '' },
    dob: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'booked', 'rejected', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
      index: true,
    },
    razorpayOrderId: { type: String, index: true }, // legacy
    razorpayPaymentId: { type: String },             // legacy
    cfOrderId: { type: String, index: true },
    cfPaymentId: { type: String },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
  },
  { timestamps: true },
);

// Hot query: slot conflict check on booking creation
BookingSchema.index({ service: 1, date: 1, timeSlot: 1, status: 1 });
// Hot query: "My Bookings" list (newest first)
BookingSchema.index({ user: 1, createdAt: -1 });
// Hot query: admin filter by status
BookingSchema.index({ status: 1, createdAt: -1 });

export const Booking: Model<BookingDoc> =
  (models.Booking as Model<BookingDoc>) || model<BookingDoc>('Booking', BookingSchema);
