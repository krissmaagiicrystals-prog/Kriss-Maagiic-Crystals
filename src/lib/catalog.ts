import { connectMongoose } from '@/lib/mongoose';
import { Product } from '@/models/Product';
import { Service } from '@/models/Service';

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice: number | null;
  image: string;
  images?: string[];
  usdPrice?: number;
  originalUsdPrice?: number | null;
  badge: 'Popular' | 'New' | 'Sale' | 'Bestseller' | null;
  desc: string;
  longDesc?: string;
  chakras: string[];
  stock: number;
  sizes?: string[];
  /** Per-size stock for bracelet products. Missing key = treat as globally stocked. */
  sizeStock?: Record<string, number>;
  variants?: {
    name: string;
    price: number;
    usdPrice: number;
    originalPrice?: number | null;
    originalUsdPrice?: number | null;
    image: string;
  }[];
  shippingCharge?: number | null;
}

export interface ServiceTier {
  label: string;
  price: number;
  usdPrice?: number;
}

export interface ServiceOption {
  id: string;
  label: string;
  price: number;
  usdPrice?: number;
}

export interface CatalogService {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  desc: string;
  image: string;
  icon: string;
  price: number;
  usdPrice?: number;
  durationMins: number;
  bullets: string[];
  tiers?: ServiceTier[];
  options?: ServiceOption[];
  videoUrl?: string;
}


export async function getAllProducts(): Promise<CatalogProduct[]> {
  try {
    await connectMongoose();
    const docs = await Product.find({ active: true, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    if (docs.length === 0) return [];
    return docs.map((d) => ({
      id: String(d._id),
      slug: d.slug,
      name: d.name,
      category: d.category,
      subcategory: d.subcategory,
      price: d.price,
      originalPrice: d.originalPrice ?? null,
      image: d.image,
      images: d.images ?? [],
      usdPrice: d.usdPrice ?? 0,
      originalUsdPrice: d.originalUsdPrice ?? null,
      badge: d.badge ?? null,
      desc: d.desc ?? '',
      longDesc: d.longDesc ?? '',
      chakras: d.chakras ?? [],
      sizes: d.sizes ?? [],
      sizeStock: d.sizeStock ? Object.fromEntries((d.sizeStock as unknown as Map<string, number>).entries?.() ?? Object.entries(d.sizeStock as unknown as Record<string, number>)) : undefined,
      variants: (d.variants ?? []).map((v: any) => ({
        name: v.name,
        price: v.price,
        usdPrice: v.usdPrice,
        originalPrice: v.originalPrice ?? null,
        originalUsdPrice: v.originalUsdPrice ?? null,
        image: v.image,
      })),
      stock: d.stock,
      shippingCharge: d.shippingCharge ?? null,
    }));
  } catch (err) {
    console.error('getAllProducts error', err);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  try {
    await connectMongoose();
    const d = await Product.findOne({ slug, active: true, isDeleted: { $ne: true } }).lean();
    if (d) {
      return {
        id: String(d._id),
        slug: d.slug,
        name: d.name,
        category: d.category,
        subcategory: d.subcategory,
        price: d.price,
        originalPrice: d.originalPrice ?? null,
        image: d.image,
        images: d.images ?? [],
        usdPrice: d.usdPrice ?? 0,
        originalUsdPrice: d.originalUsdPrice ?? null,
        badge: d.badge ?? null,
        desc: d.desc ?? '',
        longDesc: d.longDesc ?? '',
        chakras: d.chakras ?? [],
        sizes: d.sizes ?? [],
        sizeStock: d.sizeStock ? Object.fromEntries((d.sizeStock as unknown as Map<string, number>).entries?.() ?? Object.entries(d.sizeStock as unknown as Record<string, number>)) : undefined,
        variants: (d.variants ?? []).map((v: any) => ({
          name: v.name,
          price: v.price,
          usdPrice: v.usdPrice,
          originalPrice: v.originalPrice ?? null,
          originalUsdPrice: v.originalUsdPrice ?? null,
          image: v.image,
        })),
        stock: d.stock,
        shippingCharge: d.shippingCharge ?? null,
      };
    }
  } catch (err) {
    console.error('getProductBySlug error', err);
  }
  return null;
}

export const SERVICE_TIERS: Record<string, ServiceTier[]> = {
  tarot: [
    { label: 'SINGLE READING (YES/NO)', price: 199, usdPrice: 8 },
    { label: 'SINGLE DETAILED READING', price: 299, usdPrice: 10 },
    { label: 'SITUATIONAL READINGS', price: 399, usdPrice: 50 },
    { label: 'MARRIAGE ANALYSIS', price: 499, usdPrice: 60 },
    { label: 'RELATIONSHIP READINGS', price: 599, usdPrice: 60 },
    { label: 'SET OF 3 QUESTIONS', price: 666, usdPrice: 30 },
    { label: 'SET OF 5 QUESTIONS', price: 999, usdPrice: 40 },
    { label: 'FUTURE SPOUSE READING', price: 999, usdPrice: 40 },
    { label: 'ANNUAL READING (WHOLE YEAR)', price: 1299, usdPrice: 100 },
    { label: 'Audio Call (30 min)', price: 1499, usdPrice: 30 },
    { label: 'Audio Call (1 hour)', price: 2999, usdPrice: 60 },
    { label: 'Audio Call (2 hours - only one slot)', price: 5999, usdPrice: 120 },
  ],
  candle: [
    { label: 'Reconciliation / "Bring Back"', price: 3200, usdPrice: 45 },
    { label: 'Love / Attraction / Soulmate', price: 4800, usdPrice: 60 },
    { label: 'Abundance / Wealth / Money / Prosperity', price: 3600, usdPrice: 50 },
    { label: 'Protection (Personal/Home/Business)', price: 5200, usdPrice: 75 },
    { label: 'Luck / Good Fortune / Job / Career / Promotion', price: 2900, usdPrice: 39 },
    { label: 'Bindings (Fidelity / Loyalty / Stop Cheating)', price: 4200, usdPrice: 55 },
    { label: 'Cleansing / Purification / House Blessing', price: 6300, usdPrice: 75 },
    { label: 'Travel Safety / Safe Journeys', price: 1800, usdPrice: 35 },
    { label: 'Fertility & Family Spells', price: 4200, usdPrice: 55 },
    { label: 'Success / Grand Success / Business Growth', price: 4500, usdPrice: 60 },
    { label: 'Psychic / Intuition / Spiritual Spells', price: 2200, usdPrice: 40 },
    { label: 'Remove Obstacles (Financial/Relationship Blocks)', price: 3800, usdPrice: 50 },
  ],
  spelljar: [
    { label: 'Mini Spell Jar', price: 2200, usdPrice: 45 },
    { label: 'Medium Spell Jar (100ml)', price: 4800, usdPrice: 95 },
    { label: 'Large Spell Jar (500ml)', price: 7300, usdPrice: 145 },
  ],
  numerology: [
    { label: 'Vehicle Number Numerology', price: 1999, usdPrice: 30 },
    { label: 'Date of Birth Numerology', price: 2499, usdPrice: 45 },
    { label: 'Mobile Number Numerology', price: 3999, usdPrice: 55 },
    { label: 'Name Numerology', price: 4999, usdPrice: 75 },
    { label: 'Any Other Specific Numerology', price: 4999, usdPrice: 85 },
    { label: 'Business / Brand Numerology', price: 9999, usdPrice: 150 },
  ],
  'tarot-video': [
    { label: 'Video Call (30 min)', price: 3499, usdPrice: 70 },
    { label: 'Video Call (1 hour)', price: 6999, usdPrice: 140 },
  ],
};

const SERVICE_FALLBACK: CatalogService[] = [
  {
    id: 'tarot',
    slug: 'tarot',
    title: 'Tarot Reading — Voice Chat & Audio Call',
    tagline: "Clarity for the questions you can't answer alone",
    desc: 'Delivered via WhatsApp voice notes or live audio calls. Receive detailed, highly personalized responses to your questions and immediate spiritual guidance.',
    image: '/service-tarot.webp',
    icon: 'fa-solid fa-headphones',
    price: 199,
    usdPrice: 8,
    durationMins: 30,
    bullets: ['Voice notes or live 1-on-1 audio', 'Audio recorded directly by the founder', 'Ask unlimited questions during live sessions'],
    tiers: SERVICE_TIERS.tarot,
  },
  {
    id: 'tarot-video',
    slug: 'tarot-video',
    title: 'Live Tarot Reading — Video Call',
    tagline: "See every card as it's drawn — face to face",
    desc: 'A live, face-to-face tarot session via WhatsApp Video Call. Witness every card reveal in real time and dive deep into the messages the cards hold for you.',
    image: '/service-tarot.webp',
    icon: 'fa-solid fa-video',
    price: 3499,
    usdPrice: 70,
    durationMins: 30,
    bullets: ['Live WhatsApp Video Call', 'See every card drawn in real time', '30 min or 60 min sessions available'],
    tiers: SERVICE_TIERS['tarot-video'],
  },
  {
    id: 'candle',
    slug: 'candle',
    title: 'Bespoke Spell Casting Ritual',
    tagline: 'Spell Casting Services',
    desc: 'Each ritual is uniquely crafted around your intention using candles, crystals, herbs, and focused energy work. Performed personally by our founder, with ritual updates and photo or video shared upon completion.',
    image: '/service-candle.webp',
    icon: 'fa-solid fa-fire-flame-curved',
    price: 1800,
    durationMins: 45,
    bullets: ['Custom-dressed & blessed candles', 'Full altar ritual by the founder', 'Photo & video proof of the ritual'],
    tiers: SERVICE_TIERS.candle,
  },
  {
    id: 'spelljar',
    slug: 'spelljar',
    title: 'Spell Jars',
    tagline: 'A sealed wish, alive in your home',
    desc: 'Custom spell jars created with herbs, crystals, oils and your written intention.',
    image: '/service-spelljar.webp',
    icon: 'fa-solid fa-jar',
    price: 2200,
    durationMins: 60,
    bullets: ['Tailored to your intention', 'Includes care + activation guide', 'Mini, Medium, and Large sizes'],
    tiers: SERVICE_TIERS.spelljar,
  },
  {
    id: 'numerology',
    slug: 'numerology',
    title: 'Numerology Services',
    tagline: 'Every session sent as PDF + WhatsApp explanation',
    desc: 'Personally prepared and customized readings for your name, business, brand, or birth chart. Delivered digitally via WhatsApp or email within 3–5 business days.',
    image: '/service-numerology.webp',
    icon: 'fa-solid fa-infinity',
    price: 1999,
    durationMins: 40,
    bullets: ['Detailed PDF chart report', '5-10 mins WhatsApp explanation', 'Tailored crystal recommendations'],
    tiers: SERVICE_TIERS.numerology,
  },
];

export async function getAllServices(): Promise<CatalogService[]> {
  try {
    await connectMongoose();
    const docs = await Service.find({ active: true, isDeleted: { $ne: true } }).sort({ createdAt: 1 }).lean();
    if (docs.length === 0) return SERVICE_FALLBACK;

    const SERVICE_ORDER = ['tarot', 'tarot-video', 'candle', 'spelljar', 'numerology'];
    docs.sort((a, b) => {
      const indexA = SERVICE_ORDER.indexOf(a.slug);
      const indexB = SERVICE_ORDER.indexOf(b.slug);
      const valA = indexA === -1 ? 999 : indexA;
      const valB = indexB === -1 ? 999 : indexB;
      return valA - valB;
    });

    return docs.map((d) => {
      // Use tiers stored in DB if present, otherwise fall back to hardcoded
      const rawTiers = (d.tiers && d.tiers.length > 0)
        ? d.tiers
        : (SERVICE_TIERS[d.slug] || []);
      const tiers: ServiceTier[] = rawTiers.map(t => ({
        label: t.label,
        price: t.price,
        usdPrice: t.usdPrice,
      }));
      const basePrice = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : d.price;
      const usdPrices = tiers.map(t => t.usdPrice).filter((p): p is number => p !== undefined && p !== null);
      const baseUsdPrice = usdPrices.length > 0 ? Math.min(...usdPrices) : ((d as any).usdPrice || Math.round(basePrice / 50));

      const rawOptions = (d as { options?: ServiceOption[] }).options ?? [];
      const options: ServiceOption[] = rawOptions.map(o => ({
        id: o.id,
        label: o.label,
        price: o.price,
        usdPrice: o.usdPrice,
      }));

      return {
        id: String(d._id),
        slug: d.slug,
        title: d.title,
        tagline: d.tagline,
        desc: d.desc,
        image: d.image,
        icon: d.icon,
        price: basePrice,
        usdPrice: baseUsdPrice,
        durationMins: d.durationMins,
        bullets: d.bullets,
        tiers,
        options,
        videoUrl: (d as { videoUrl?: string }).videoUrl || '',
      };
    });
  } catch (err) {
    console.error('getAllServices fallback', err);
    return SERVICE_FALLBACK;
  }
}

export async function getServiceById(id: string): Promise<CatalogService | null> {
  try {
    await connectMongoose();
    // Try by ObjectId, then by slug.
    type ServiceLeanDoc = {
      _id: unknown;
      slug: string;
      title: string;
      tagline: string;
      desc: string;
      image: string;
      icon: string;
      price: number;
      usdPrice?: number;
      durationMins: number;
      bullets: string[];
      tiers?: ServiceTier[];
      options?: ServiceOption[];
    };
    let doc: ServiceLeanDoc | null = null;
    if (/^[a-f0-9]{24}$/i.test(id)) {
      doc = (await Service.findOne({ _id: id, isDeleted: { $ne: true } }).lean()) as ServiceLeanDoc | null;
    }
    if (!doc) {
      doc = (await Service.findOne({ slug: id, isDeleted: { $ne: true } }).lean()) as ServiceLeanDoc | null;
    }
    if (doc) {
      // Prefer tiers/options saved in the DB (admin-editable); fall back to hardcoded only if none.
      const rawTiers = (doc.tiers && doc.tiers.length > 0) ? doc.tiers : (SERVICE_TIERS[doc.slug] || []);
      const tiers: ServiceTier[] = rawTiers.map(t => ({
        label: t.label,
        price: t.price,
        usdPrice: t.usdPrice,
      }));
      const rawOptions = doc.options ?? [];
      const options: ServiceOption[] = rawOptions.map(o => ({
        id: o.id,
        label: o.label,
        price: o.price,
        usdPrice: o.usdPrice,
      }));
      const basePrice = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : doc.price;
      const usdPrices = tiers.map(t => t.usdPrice).filter((p): p is number => p !== undefined && p !== null);
      const baseUsdPrice = usdPrices.length > 0 ? Math.min(...usdPrices) : (doc.usdPrice || Math.round(basePrice / 50));

      return {
        id: String(doc._id),
        slug: doc.slug,
        title: doc.title,
        tagline: doc.tagline,
        desc: doc.desc,
        image: doc.image,
        icon: doc.icon,
        price: basePrice,
        usdPrice: baseUsdPrice,
        durationMins: doc.durationMins,
        bullets: doc.bullets,
        tiers,
        options,
      };
    }
  } catch (err) {
    console.error('getServiceById fallback', err);
  }
  return SERVICE_FALLBACK.find((s) => s.slug === id) ?? null;
}
