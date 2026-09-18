import mongoose, { Schema, models, model, Model } from 'mongoose';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed';
/** International shipping is settled separately via an admin-sent payment link. */
export type ShippingPaymentStatus = 'not-required' | 'pending' | 'link-sent' | 'paid';

export interface ShippingPayment {
  status: ShippingPaymentStatus;
  link?: string | null;
  amount?: number | null;
  note?: string | null;
  sentAt?: Date | null;
  paidAt?: Date | null;
}

export interface OrderLine {
  productId?: mongoose.Types.ObjectId | string | null;
  productSlug: string;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
  size?: string | null;
}

export interface OrderDoc {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  user?: mongoose.Types.ObjectId | null;
  sessionId?: string | null;
  items: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  international: boolean;
  shippingPayment?: ShippingPayment;
  currency: string;
  inrAmount?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string | null;   // legacy — kept for existing records
  razorpayPaymentId?: string | null; // legacy — kept for existing records
  cfOrderId?: string | null;
  cfPaymentId?: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    dob?: string;
    notes?: string;
    giftMessage?: string | null;
    giftRecipient?: string | null;
  };
  adminNote?: string;
  customizationDetails?: any;
  createdAt: Date;
  updatedAt: Date;
}

const OrderLineSchema = new Schema<OrderLine>(
  {
    productId: { type: Schema.Types.Mixed, ref: 'Product', default: null },
    productSlug: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
    size: { type: String, default: null },
  },
  { _id: false },
);

const OrderSchema = new Schema<OrderDoc>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    sessionId: { type: String, default: null, index: true },
    items: { type: [OrderLineSchema], required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    international: { type: Boolean, default: false },
    shippingPayment: {
      status: {
        type: String,
        enum: ['not-required', 'pending', 'link-sent', 'paid'],
        default: 'not-required',
      },
      link: { type: String, default: null },
      amount: { type: Number, default: null },
      note: { type: String, default: null },
      sentAt: { type: Date, default: null },
      paidAt: { type: Date, default: null },
    },
    currency: { type: String, default: 'INR' },
    inrAmount: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'failed'],
      default: 'unpaid',
      index: true,
    },
    razorpayOrderId: { type: String, default: null, index: true },  // legacy
    razorpayPaymentId: { type: String, default: null },              // legacy
    cfOrderId: { type: String, default: null, index: true },
    cfPaymentId: { type: String, default: null },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true },
      dob: { type: String, default: '' },
      notes: { type: String, default: '' },
      giftMessage: { type: String, default: null },
      giftRecipient: { type: String, default: null },
    },
    adminNote: { type: String, default: '' },
    customizationDetails: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// Hot query: "My Orders" list
OrderSchema.index({ user: 1, createdAt: -1 });
// Hot query: admin status filter
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order: Model<OrderDoc> =
  (models.Order as Model<OrderDoc>) || model<OrderDoc>('Order', OrderSchema);
