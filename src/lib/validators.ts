import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(7, 'Please enter a valid phone number.').max(30),
  password: z.string().min(8).max(128),
  country: z.string().length(2, 'Please select your country'),
  otp: z.string().length(6, 'OTP must be 6 digits').optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal('')),
  subject: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(5).max(2000),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(99),
});

export const updateCartSchema = z.object({
  items: z.array(cartItemSchema),
});

export const orderCustomerSchema = z.object({
  name: z.string().min(2, 'Please enter your full name.').max(120),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().min(7, 'Please enter a valid phone number.').max(30),
  address: z.string().min(5, 'Please enter your full street address.').max(400),
  city: z.string().min(2, 'Please enter your city.').max(80),
  state: z.string().min(2, 'Please enter your state or province.').max(80),
  pincode: z.string().min(4, 'Please enter a valid postal or ZIP code.').max(12),
  country: z.string().min(2, 'Please select your country.').max(80),
  dob: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(600).optional().or(z.literal('')),
  giftMessage: z.string().max(300).optional().or(z.literal('')),
  giftRecipient: z.string().max(120).optional().or(z.literal('')),
});

export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  customer: orderCustomerSchema,
  currency: z.string().min(2).max(5).optional().default('INR'),
  customizationDetails: z.any().optional(),
});

export const razorpayCreateSchema = z.object({
  orderId: z.string().min(1),
});

export const razorpayVerifySchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
});

export const productInputSchema = z.object({
  slug: z.string()
    .min(2, 'URL slug is required (at least 2 characters).')
    .max(120, 'URL slug is too long (max 120 characters).')
    .regex(/^[a-z0-9-]+$/, 'URL slug must use lowercase letters, numbers, and dashes only.'),
  name: z.string()
    .min(2, 'Product name is required (at least 2 characters).')
    .max(200, 'Product name is too long (max 200 characters).'),
  category: z.string()
    .min(2, 'Please select or enter a category.')
    .max(80),
  subcategory: z.string()
    .min(2, 'Please select or enter a subcategory.')
    .max(120),
  price: z.number().min(1, 'Price (₹) is required and must be greater than 0.'),
  originalPrice: z.number().min(0).nullable().optional(),
  usdPrice: z.number().min(0).optional(),
  originalUsdPrice: z.number().min(0).nullable().optional(),
  image: z.string().min(1, 'Please upload a product image before saving.'),
  images: z.array(z.string()).default([]),
  badge: z.enum(['Popular', 'New', 'Sale', 'Bestseller']).nullable().optional(),
  desc: z.string()
    .min(5, 'Short description is required (at least 5 characters).')
    .max(600, 'Short description is too long (max 600 characters).'),
  longDesc: z.string().max(40000).optional().or(z.literal('')),
  chakras: z.array(z.string()).default([]),
  shippingCharge: z.number().min(0).max(100000).nullable().optional(),
  stock: z.number().int().min(0).default(99),
  sizes: z.array(z.string()).default([]),
  /** Per-size stock map for bracelet products e.g. { "6mm": 5, "8mm": 12 } */
  sizeStock: z.record(z.string(), z.number().int().min(0)).optional(),
  active: z.boolean().default(true),
});

export const serviceInputSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(120),
  tagline: z.string().max(200).optional().or(z.literal('')),
  desc: z.string().min(5).max(2000),
  image: z.string().min(1),
  icon: z.string().max(120).default('fa-solid fa-sparkles'),
  price: z.number().min(0),
  usdPrice: z.number().min(0).default(0),
  durationMins: z.number().int().min(5).max(600),
  bullets: z.array(z.string()).default([]),
  tiers: z.array(z.object({
    label: z.string().min(1).max(200),
    price: z.number().min(0),
    usdPrice: z.number().min(0).default(0),
  })).default([]),
  options: z.array(z.object({
    id: z.string().min(1).max(120),
    label: z.string().min(1).max(200),
    price: z.number().min(0),
    usdPrice: z.number().min(0).default(0),
  })).default([]),
  videoUrl: z.string().max(500).optional().or(z.literal('')),
  active: z.boolean().default(true),
});

export const createBookingSchema = z.object({
  // Accepts a Mongo ObjectId OR a service slug (e.g. "tarot")
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid date').optional().or(z.literal('N/A')),
  timeSlot: z
    .string()
    .regex(/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i, 'Please select a valid time slot (e.g. 10:30 AM)')
    .optional()
    .or(z.literal('N/A')),
  question: z.string().max(1000).optional().or(z.literal('')),
  intention: z.string().max(1000).optional().or(z.literal('')),
  dob: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(600).optional().or(z.literal('')),
  // Optional tier — overrides title + price when present (for tier-based session cards)
  tierLabel: z.string().max(500).optional(),
  tierPrice: z.number().min(0).optional(),
  tierUsdPrice: z.number().min(0).optional(),
  currency: z.string().length(3).optional().default('INR'),
  customer: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().min(7).max(30),
  }),
});

export const bookingStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']),
  adminNote: z.string().max(600).optional().or(z.literal('')),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  adminNote: z.string().max(600).optional().or(z.literal('')),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(30).optional().or(z.literal('')),
  country: z.string().min(2).max(120),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const FRIENDLY_FIELD: Record<string, string> = {
  // Product fields
  name:        'Product name is required (at least 2 characters).',
  slug:        'URL slug is required — use lowercase letters, numbers, and dashes only (e.g. amethyst-bracelet).',
  category:    'Please select or enter a category.',
  subcategory: 'Please select or enter a subcategory.',
  price:       'Price (₹) is required and must be greater than 0.',
  image:       'Please upload a product image before saving.',
  desc:        'Short description is required (at least 5 characters).',
  // Booking fields
  timeSlot:    'Please select a valid time slot before booking.',
  date:            'Please select a valid booking date.',
  serviceId:       'Something went wrong — please refresh and try again.',
  question:        'Your question is too long (max 1000 characters).',
  notes:           'Notes are too long (max 600 characters).',
  // Shared customer sub-object (bookings + orders)
  'customer.name':    'Please enter your full name.',
  'customer.email':   'Please enter a valid email address.',
  'customer.phone':   'Please enter a valid phone number.',
  // Order-specific customer fields
  'customer.address': 'Please enter your full street address.',
  'customer.city':    'Please enter your city.',
  'customer.state':   'Please enter your state or province.',
  'customer.pincode': 'Please enter a valid postal or ZIP code.',
  'customer.country': 'Please select your country.',
  // Cart
  items:           'Your cart is empty — please add items before checking out.',
};

function getFriendlyFieldName(path: string): string {
  const dictionary: Record<string, string> = {
    // Product fields
    slug: 'URL Slug',
    name: 'Product Name',
    category: 'Category',
    subcategory: 'Subcategory',
    price: 'Price (₹)',
    originalPrice: 'Original Price (₹)',
    usdPrice: 'Price (USD)',
    originalUsdPrice: 'Original Price (USD)',
    image: 'Product Image',
    images: 'Gallery Images',
    badge: 'Badge Overlay',
    desc: 'Short Description',
    longDesc: 'Long Description',
    chakras: 'Chakras',
    shippingCharge: 'Shipping Charge',
    stock: 'Stock',
    active: 'Status',
    // Booking fields
    serviceId: 'Service ID',
    date: 'Booking Date',
    timeSlot: 'Time Slot',
    question: 'Question',
    intention: 'Intention',
    notes: 'Notes',
    // Shared customer sub-object (bookings + orders)
    'customer.name': 'Customer Name',
    'customer.email': 'Customer Email',
    'customer.phone': 'Customer Phone',
    // Order-specific customer fields
    'customer.address': 'Customer Address',
    'customer.city': 'Customer City',
    'customer.state': 'Customer State',
    'customer.pincode': 'Customer Pincode',
    'customer.country': 'Customer Country',
  };

  if (dictionary[path]) return dictionary[path];

  // Fallback: convert camelCase or dot notation to friendly label
  return path
    .split('.')
    .map((part) => {
      if (/^\d+$/.test(part)) return `[Index ${part}]`;
      return part
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]/g, ' ')
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase());
    })
    .join(' -> ');
}

export function zodErrorMessage(err: z.ZodError): string {
  return err.issues
    .map((issue) => {
      const i = issue as any;
      const path = i.path.join('.');
      
      // If we have a custom friendly message mapped to the exact path, use it directly
      if (FRIENDLY_FIELD[path]) {
        return FRIENDLY_FIELD[path];
      }

      const friendlyName = getFriendlyFieldName(path);

      // Generate a friendly message based on the Zod issue type/code
      let msg = i.message;
      if (i.code === 'invalid_type') {
        if (i.received === 'undefined' || i.received === 'null') {
          msg = 'is required';
        } else {
          msg = `must be a ${i.expected} (received ${i.received})`;
        }
      } else if (i.code === 'too_small') {
        if (i.type === 'string') {
          msg = i.minimum === 1
            ? 'is required (cannot be empty)'
            : `must be at least ${i.minimum} characters`;
        } else if (i.type === 'number') {
          msg = `must be greater than or equal to ${i.minimum}`;
        } else if (i.type === 'array') {
          msg = `must have at least ${i.minimum} items`;
        }
      } else if (i.code === 'too_big') {
        if (i.type === 'string') {
          msg = `must be at most ${i.maximum} characters`;
        } else if (i.type === 'number') {
          msg = `must be less than or equal to ${i.maximum}`;
        } else if (i.type === 'array') {
          msg = `must have at most ${i.maximum} items`;
        }
      } else if (i.code === 'invalid_enum_value') {
        msg = `must be one of: ${i.options.map((o: any) => `"${o}"`).join(', ')}`;
      } else if (i.code === 'invalid_string') {
        if (i.validation === 'email') {
          msg = 'must be a valid email address';
        } else if (i.validation === 'url') {
          msg = 'must be a valid URL';
        }
      }

      return `${friendlyName} ${msg}.`;
    })
    .join(' ');
}

export const blogInputSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(150).regex(/^[a-z0-9-]+$/),
  content: z.string().min(10),
  excerpt: z.string().min(10).max(400),
  image: z.string().min(1),
  author: z.string().min(2).max(100),
  published: z.boolean().default(false),
});

export const testimonialInputSchema = z.object({
  name: z.string().min(2).max(100),
  role: z.string().min(2).max(150),
  rating: z.number().int().min(1).max(5),
  text: z
    .string()
    .min(5)
    .max(3000)
    .refine(
      (v) => v.trim().split(/\s+/).filter(Boolean).length <= 300,
      'Keep the review under 300 words.',
    ),
  avatar: z.string().min(1).max(10),
});
