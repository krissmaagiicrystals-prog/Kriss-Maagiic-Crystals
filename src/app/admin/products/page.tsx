import Link from 'next/link';
import { connectMongoose } from '@/lib/mongoose';
import { Product } from '@/models/Product';
import ProductRowActions from './ProductRowActions';
import ProductRow from './ProductRow';
import StockEditor from './StockEditor';
import ProductFilters from './ProductFilters';
import FinalPriceEditor from './FinalPriceEditor';
import UsdPriceEditor from './UsdPriceEditor';
import SizesEditor from './SizesEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Products · Admin' };

interface SP {
  q?: string;
  category?: string;
  status?: string;
  sort?: string;
  page?: string;
}

export default async function AdminProducts(props: PageProps<'/admin/products'>) {
  const sp = (await props.searchParams) as SP;
  const q = sp.q || '';
  const category = sp.category || '';
  const status = sp.status || '';
  const sort = sp.sort || '';
  const sortSpec: Record<string, 1 | -1> =
    sort === 'name' ? { name: 1 } : sort === 'name-desc' ? { name: -1 } : { createdAt: -1 };

  const page = Number(sp.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  await connectMongoose();

  /* Deleted count (for the Trash badge) */
  const trashedCount = await Product.countDocuments({ isDeleted: true });

  /* ── Build filter ── */
  const isTrashView = status === 'deleted';
  const filter: Record<string, unknown> = {};
  
  // Define which filters are subcategories vs categories
  const SUBCATEGORY_FILTERS = [
    'Bracelets', 'Designer Bracelets', 'Zodiac Bracelets', 'Signature Bracelets',
    'Designer Rings', 'Chips Bracelet'
  ];
  
  // Handle category filter - check if it's a category or subcategory
  if (category) {
    if (SUBCATEGORY_FILTERS.includes(category)) {
      // It's a subcategory filter
      filter.subcategory = category;
    } else {
      // It's a category filter
      filter.category = category;
    }
  }
  
  if (isTrashView) {
    filter.isDeleted = true;
  } else {
    filter.isDeleted = { $ne: true };
    if (status === 'live') filter.active = true;
    if (status === 'hidden') filter.active = false;
  }
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { slug: { $regex: q, $options: 'i' } },
      { subcategory: { $regex: q, $options: 'i' } },
    ];
  }

  const [items, totalCount, uniqueCategories] = await Promise.all([
    Product.find(filter).sort(sortSpec).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
    Product.distinct('category'),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const startItem = totalCount === 0 ? 0 : skip + 1;
  const endItem = Math.min(skip + limit, totalCount);

  // Preserve the current filters so the edit page can return here (same category, etc.)
  const backParams = (() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (sort) params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    return params.toString();
  })();

  function getPageUrl(pageNum: number) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (sort) params.set('sort', sort);
    params.set('page', String(pageNum));
    return `/admin/products?${params.toString()}`;
  }

  return (
    <div>
      {/* ── Header row ── */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', margin: 0 }}>
            {isTrashView ? (
              <>🗑️ Trash <span style={{ fontSize: '1.1rem', color: '#888', fontWeight: 400 }}>({totalCount} deleted)</span></>
            ) : (
              <>Products <span style={{ fontSize: '1.1rem', color: '#888', fontWeight: 400 }}>({totalCount} total)</span></>
            )}
          </h1>
          {isTrashView && (
            <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: '#B0B0B0' }}>
              Deleted products are listed here. You can restore any item.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Trash tab */}
          {isTrashView ? (
            <Link
              href="/admin/products"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)',
                color: '#555', borderRadius: 30,
                padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.75rem' }}></i>
              Back to Products
            </Link>
          ) : (
            <Link
              href="/admin/products?status=deleted"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: trashedCount > 0 ? '#FFF3E0' : '#FAF6F1',
                border: `1.5px solid ${trashedCount > 0 ? '#FFCC80' : 'rgba(0,0,0,0.1)'}`,
                color: trashedCount > 0 ? '#E65100' : '#999',
                borderRadius: 30, padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <i className="fa-solid fa-trash-can" style={{ fontSize: '0.8rem' }}></i>
              Trash
              {trashedCount > 0 && (
                <span style={{
                  background: '#E65100', color: '#fff',
                  borderRadius: 30, fontSize: '0.7rem', fontWeight: 700,
                  padding: '1px 7px', lineHeight: '1.6',
                }}>
                  {trashedCount}
                </span>
              )}
            </Link>
          )}

          {/* New product button (hidden in trash view) */}
          {!isTrashView && (
            <Link href="/admin/products/new" className="btn-primary-custom">
              <i className="fa-solid fa-plus"></i><span>New Product</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Trash banner ── */}
      {isTrashView && (
        <div style={{
          background: '#FFF3E0', border: '1px solid #FFCC80',
          borderRadius: 12, padding: '12px 18px', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.88rem', color: '#E65100',
        }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            <strong>Trash view</strong> — Products here are hidden from the shop. Click <strong>Restore</strong> to bring one back.
          </span>
          <Link href="/admin/products" style={{ marginLeft: 'auto', color: '#E65100', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
            Exit Trash
          </Link>
        </div>
      )}

      {/* ── Search, Filter & Sort (hidden in trash view) ── */}
      {!isTrashView && (
        <ProductFilters />
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: isTrashView ? '#FFF8F0' : '#FAF6F1' }}>
                <th style={{ padding: 12, width: 60 }}></th>
                <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Category</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Price</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Final Price</th>
                <th style={{ padding: 12, textAlign: 'left' }}>USD Price</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Stock</th>
                {!isTrashView && <th style={{ padding: 12, textAlign: 'left' }}>Sizes &amp; Stock (bracelets)</th>}
                {!isTrashView && <th style={{ padding: 12, textAlign: 'left' }}>Status</th>}
                <th style={{ padding: 12, textAlign: 'right', width: isTrashView ? 110 : 180 }}>
                  {isTrashView ? 'Action' : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={isTrashView ? 8 : 10} style={{ padding: 32, textAlign: 'center', color: '#999' }}>
                    <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block', color: '#ccc' }}></i>
                    {isTrashView ? 'No deleted products — trash is empty.' : 'No products found matching these criteria.'}
                  </td>
                </tr>
              )}
              {items.map((p) => (
                <ProductRow
                  key={String(p._id)}
                  isTrashView={isTrashView}
                  editHref={isTrashView ? null : (backParams ? `/admin/products/${String(p._id)}?${backParams}` : `/admin/products/${String(p._id)}`)}
                >
                  <td style={{ padding: 8 }}>
                    <img src={p.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', opacity: isTrashView ? 0.5 : 1 }} />
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600, textDecoration: isTrashView ? 'line-through' : 'none', color: isTrashView ? '#AAA' : undefined }}>
                      {p.name}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.78rem' }}>/{p.slug}</div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{ fontSize: '0.85rem', color: '#888' }}>{p.category}</span>
                    <div style={{ fontWeight: 500 }}>{p.subcategory}</div>
                  </td>
                  <td style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#888', textDecoration: 'line-through', fontSize: '0.82rem' }}>{p.originalPrice ? `₹${p.originalPrice.toLocaleString('en-IN')}` : '—'}</td>
                  <td style={{ padding: 12, textAlign: 'left' }} data-no-row-nav>
                    {isTrashView
                      ? <span style={{ fontWeight: 600 }}>₹{p.price.toLocaleString('en-IN')}</span>
                      : <FinalPriceEditor id={String(p._id)} price={p.price} />}
                  </td>
                  <td style={{ padding: 12, textAlign: 'left' }} data-no-row-nav>
                    {isTrashView
                      ? <span style={{ fontWeight: 600 }}>{'$' + (p.usdPrice ?? 0)}</span>
                      : <UsdPriceEditor id={String(p._id)} usdPrice={p.usdPrice ?? 0} />}
                  </td>
                  <td style={{ padding: 12, textAlign: 'left' }} data-no-row-nav>
                    {isTrashView ? p.stock : <StockEditor id={String(p._id)} stock={p.stock} />}
                  </td>
                  {!isTrashView && (
                    <td style={{ padding: 12, textAlign: 'left' }} data-no-row-nav>
                      {(p.category ?? '').toLowerCase().includes('bracelet') || (p.subcategory ?? '').toLowerCase().includes('bracelet')
                        ? <SizesEditor
                            id={String(p._id)}
                            sizes={(p.sizes ?? []) as string[]}
                            sizeStock={((p as any).sizeStock ?? {}) as Record<string, number>}
                          />
                        : <span style={{ color: '#ccc', fontSize: '0.8rem' }}>—</span>}
                    </td>
                  )}
                  {!isTrashView && (
                    <td style={{ padding: 12, textAlign: 'left' }}>
                      <span className="crystal-tag" style={{ fontSize: '0.72rem', background: p.active ? '#4CAF5022' : '#D95F5F22', color: p.active ? '#1E8449' : '#A94442' }}>
                        {p.active ? 'live' : 'hidden'}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }} data-no-row-nav>
                    <ProductRowActions id={String(p._id)} isDeleted={!!p.isDeleted} backParams={backParams} />
                  </td>
                </ProductRow>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination UI ── */}
        {totalCount > 0 && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              background: '#FCFBF9',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              Showing <span style={{ fontWeight: 600, color: '#333' }}>{startItem}</span> to{' '}
              <span style={{ fontWeight: 600, color: '#333' }}>{endItem}</span> of{' '}
              <span style={{ fontWeight: 600, color: '#333' }}>{totalCount}</span> products
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Previous page link */}
                {page > 1 ? (
                  <Link
                    href={getPageUrl(page - 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.08)',
                      background: '#fff',
                      color: '#555',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.75rem' }}></i>
                  </Link>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.04)',
                      background: '#FAF6F1',
                      color: '#ccc',
                      fontSize: '0.85rem',
                      cursor: 'not-allowed',
                    }}
                  >
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.75rem' }}></i>
                  </span>
                )}

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isCurrent = page === pageNum;
                  const isNear = Math.abs(page - pageNum) <= 2;
                  const isEdge = pageNum === 1 || pageNum === totalPages;

                  if (!isNear && !isEdge) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return <span key={pageNum} style={{ padding: '0 4px', color: '#999' }}>...</span>;
                    }
                    return null;
                  }

                  return (
                    <Link
                      key={pageNum}
                      href={getPageUrl(pageNum)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: isCurrent ? '1.5px solid var(--primary,#C8956C)' : '1px solid rgba(0,0,0,0.08)',
                        background: isCurrent ? 'var(--primary,#C8956C)' : '#fff',
                        color: isCurrent ? '#fff' : '#555',
                        fontWeight: isCurrent ? 700 : 500,
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      {pageNum}
                    </Link>
                  );
                })}

                {/* Next page link */}
                {page < totalPages ? (
                  <Link
                    href={getPageUrl(page + 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.08)',
                      background: '#fff',
                      color: '#555',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
                  </Link>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.04)',
                      background: '#FAF6F1',
                      color: '#ccc',
                      fontSize: '0.85rem',
                      cursor: 'not-allowed',
                    }}
                  >
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

