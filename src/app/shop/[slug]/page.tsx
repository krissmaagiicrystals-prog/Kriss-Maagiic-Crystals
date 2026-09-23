import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllProducts, getProductBySlug, type CatalogProduct } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import ProductDescription, { type DescObj } from './ProductDescription';
import ProductDetailsClient from './ProductDetailsClient';
import ProductReviews from './ProductReviews';


export const dynamic = 'force-dynamic';

const SITE_NAME = 'KrissMaagiic Crystals';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.krissmaagiiccrystals.com';

/** Build a clean, plain-text meta description from a product (skips JSON blobs, trims to ~160 chars). */
function metaDescriptionFor(product: CatalogProduct): string {
  const raw = (product.desc || '').trim();
  const plain = raw && !raw.startsWith('{') && !raw.startsWith('[')
    ? raw
    : `${product.name} — an authentic, energy-cleansed crystal from ${SITE_NAME}. Sourced with care and ritually charged.`;
  return plain.length > 160 ? plain.slice(0, 157).trimEnd() + '…' : plain;
}

export async function generateMetadata(props: PageProps<'/shop/[slug]'>) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: `Product Not Found · ${SITE_NAME}` };

  const seo = (product as unknown as { seo?: { title?: string; description?: string; keywords?: string[] } }).seo || {};
  const description = seo.description || metaDescriptionFor(product);
  const title = seo.title || `${product.name} · ${SITE_NAME}`;
  const keywords = seo.keywords && seo.keywords.length
    ? seo.keywords
    : [
        product.name,
        (product.subcategory || product.category || '').replace(/-/g, ' '),
        ...(product.chakras || []).filter(Boolean).map((c) => `${c} chakra`),
        'crystal', 'healing crystal', 'spiritual', SITE_NAME,
      ].filter(Boolean);

  const path = `/shop/${product.slug}`;
  const images = [product.image, ...(product.images || [])].filter(Boolean);

  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      siteName: SITE_NAME,
      type: 'website',
      images: images.map((url) => ({ url, alt: product.name })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function ProductPage(props: PageProps<'/shop/[slug]'>) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const all = await getAllProducts();

  // Group products by collection for better related-products matching.
  const getProductGroup = (p: { category: string; subcategory?: string; name: string }) => {
    const sub = (p.subcategory || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    if (sub === 'designer bracelets') return 'designer';
    if (sub === 'signature bracelets') return 'signature';
    if (cat === 'bracelets') return 'bycrystal';
    // Non-bracelet items group by their (re-tagged) category: malas, pendants,
    // silver-jewelry, anklets, home-decor, spell-jars, etc.
    return cat || 'other';
  };

  const productGroup = getProductGroup(product);
  const related = all
    .filter((p) => p.slug !== product.slug && getProductGroup(p) === productGroup)
    .slice(0, 6);

  // Safely parse JSON description if present in desc or longDesc
  let descObj: DescObj | null = null;

  let rawJsonField = '';
  if (product.desc && (product.desc.trim().startsWith('{') || product.desc.trim().startsWith('['))) {
    rawJsonField = product.desc;
  } else if (product.longDesc && (product.longDesc.trim().startsWith('{') || product.longDesc.trim().startsWith('['))) {
    rawJsonField = product.longDesc;
  }

  try {
    if (rawJsonField) {
      descObj = JSON.parse(rawJsonField);
    }
  } catch {
    // Fail silently
  }

  // JSON-LD structured data → richer Google product results (price, availability, image).
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: [product.image, ...(product.images || [])].filter(Boolean),
    description: metaDescriptionFor(product),
    category: (product.subcategory || product.category || '').replace(/-/g, ' '),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/shop/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section style={{ paddingTop: '140px', paddingBottom: '40px', background: 'linear-gradient(135deg,#1C0A02,#2D1B0E)', color: '#fff' }}>
        <div className="container">
          <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            <Link href="/" style={{ color: 'inherit' }}>Home</Link>
            {' / '}
            <Link href="/shop" style={{ color: 'inherit' }}>Shop</Link>
            {' / '}
            <span style={{ color: 'var(--accent,#E8C99A)' }}>{product.name}</span>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <ProductDetailsClient 
            product={product} 
            sizesLabel={descObj?.sizesLabel} 
            showSizes={descObj?.showSizes !== false}
          >
            {/* Product description / JSON layout rendering */}
            <ProductDescription descObj={descObj} desc={product.desc} longDesc={product.longDesc} category={product.category} subcategory={product.subcategory} chakras={product.chakras} />

            {descObj?.showChakras !== false && product.chakras && product.chakras.filter((ch: string) => ch && ch.trim()).length > 0 && (
              <div className="mt-4">
                <h6 className="footer-heading" style={{ color: 'var(--text,#2D1B0E)' }}>
                  {descObj?.chakrasLabel || 'Aligned Chakras'}
                </h6>
                <div className="crystal-tags" style={{ justifyContent: 'flex-start' }}>
                  {product.chakras
                    .filter((ch: string) => ch && ch.trim())
                    .map((ch: string) => (
                      <span
                        className="crystal-tag"
                        key={ch}
                        style={{
                          background: 'rgba(200, 149, 108, 0.12)',
                          color: '#8A4F27',
                          borderColor: 'rgba(200, 149, 108, 0.35)'
                        }}
                      >
                        {ch}
                      </span>
                    ))}
                </div>
              </div>
            )}
            </ProductDetailsClient>

            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(200, 149, 108, 0.15)' }}>
              <ProductReviews productSlug={product.slug} />
            </div>

        </div>
      </section>

      {related.length > 0 && (
        <section className="products-section section-pad" style={{ background: 'var(--bg-soft,#FAF6F1)' }}>
          <div className="container">
            <div className="text-center mb-5">
              <span className="section-eyebrow">You May Also Love</span>
              <h2 className="section-title" style={{ color: 'var(--dark-2,#2D1B0E)' }}>Similar <span>Crystals</span></h2>
              <div className="divider-ornament"><i className="fa-solid fa-diamond-turn-right"></i></div>
            </div>
            <div className="shop-products-grid">
              {related.map((p) => (
                <ProductCard key={p.slug} product={{
                  id: p.slug, name: p.name, category: p.category, subcategory: p.subcategory,
                  price: p.price, originalPrice: p.originalPrice, image: p.image, badge: p.badge,
                  desc: p.desc, chakras: p.chakras,
                }} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
