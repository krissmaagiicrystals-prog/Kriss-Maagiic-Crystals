import { MetadataRoute } from 'next';
import { connectMongoose } from '@/lib/mongoose';
import { Product } from '@/models/Product';
import Blog from '@/models/Blog';

export const dynamic = 'force-dynamic';

// Canonical host — the site serves on www and 308-redirects the bare domain there,
// so every sitemap URL must already be the www one or Google crawls a redirect.
const baseUrl = 'https://www.krissmaagiiccrystals.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static URLs
  const staticUrls = [
    '',
    '/about',
    '/founder',
    '/add-review',
    '/contact',
    '/crystal-strength',
    '/services',
    '/shop',
    '/blogs',
    '/privacy-policy',
    '/returns',
    '/shipping-policy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  let productUrls: MetadataRoute.Sitemap = [];
  let blogUrls: MetadataRoute.Sitemap = [];

  try {
    await connectMongoose();

    // Fetch active products. Matches the storefront query in lib/catalog.ts —
    // products migrated from the old store have no isDeleted field at all, so
    // `isDeleted: false` would exclude them and leave the sitemap empty.
    const products = await Product.find({ active: true, isDeleted: { $ne: true } })
      .select('slug updatedAt')
      .lean();
    productUrls = products
      .filter((p: any) => p.slug)
      .map((p: any) => ({
        url: `${baseUrl}/shop/${p.slug}`,
        lastModified: p.updatedAt || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));

    // Fetch published blogs (same filter as the /blogs listing page).
    const blogs = await Blog.find({ published: true, isDeleted: { $ne: true } })
      .select('slug updatedAt')
      .lean();
    blogUrls = blogs
      .filter((b: any) => b.slug)
      .map((b: any) => ({
        url: `${baseUrl}/blogs/${b.slug}`,
        lastModified: b.updatedAt || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }));
  } catch (err) {
    // Never fail the whole sitemap on a DB hiccup — still serve the static pages.
    console.error('Failed to generate dynamic sitemap entries:', err);
  }

  return [...staticUrls, ...productUrls, ...blogUrls];
}
