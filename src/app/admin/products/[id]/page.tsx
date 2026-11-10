import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectMongoose } from '@/lib/mongoose';
import { Product } from '@/models/Product';
import ProductForm from '../ProductForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit Product · Admin' };

export default async function EditProductPage(props: PageProps<'/admin/products/[id]'>) {
  const { id } = await props.params;
  await connectMongoose();
  const p = await Product.findById(id).lean();
  if (!p) notFound();
  return (
    <div>
      <Link href="/admin/products" style={{ color: 'var(--primary,#C8956C)', fontSize: '0.85rem' }}>← All products</Link>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginTop: 12 }}>Edit product</h1>
      <ProductForm
        id={String(p._id)}
        initial={{
          slug: p.slug,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory,
          price: p.price,
          originalPrice: p.originalPrice ?? null,
          usdPrice: p.usdPrice ?? 0,
          originalUsdPrice: p.originalUsdPrice ?? null,
          image: p.image,
          images: p.images ?? [],
          badge: p.badge ?? null,
          desc: p.desc,
          longDesc: p.longDesc ?? '',
          chakras: p.chakras,
          shippingCharge: p.shippingCharge ?? null,
          stock: p.stock,
          sizes: p.sizes ?? [],
          sizeStock: ((p as any).sizeStock ?? {}) as Record<string, number>,
          active: p.active,
        }}
      />
    </div>
  );
}
