import mongoose, { Schema, models, model, Model } from 'mongoose';

export interface ProductDoc {
  _id: mongoose.Types.ObjectId;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  images?: string[];
  usdPrice?: number;
  originalUsdPrice?: number | null;
  variants?: {
    name: string;
    price: number;
    usdPrice: number;
    originalPrice?: number | null;
    originalUsdPrice?: number | null;
    image: string;
  }[];
  badge?: 'Popular' | 'New' | 'Sale' | 'Bestseller' | null;
  desc: string;
  longDesc?: string;
  chakras: string[];
  /** Optional India shipping override (₹). When null, the rate is computed from category in lib/shipping. */
  shippingCharge?: number | null;
  stock: number;
  sizes?: string[];
  /** Per-size stock counts for bracelet products (e.g. { "6mm": 5, "8mm": 12 }) */
  sizeStock?: Map<string, number>;
  active: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDoc>(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null, min: 0 },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    usdPrice: { type: Number, default: 0 },
    originalUsdPrice: { type: Number, default: null },
    variants: {
      type: [
        {
          name: { type: String, required: true },
          price: { type: Number, required: true },
          usdPrice: { type: Number, required: true },
          originalPrice: { type: Number, default: null },
          originalUsdPrice: { type: Number, default: null },
          image: { type: String, required: true },
        }
      ],
      default: undefined
    },
    badge: { type: String, enum: ['Popular', 'New', 'Sale', 'Bestseller', null], default: null },
    desc: { type: String, required: true },
    longDesc: { type: String, default: '' },
    chakras: { type: [String], default: [] },
    shippingCharge: { type: Number, default: null },
    stock: { type: Number, default: 99, min: 0 },
    sizes: { type: [String], default: [] },
    sizeStock: { type: Map, of: Number, default: {} },
    active: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) || model<ProductDoc>('Product', ProductSchema);
