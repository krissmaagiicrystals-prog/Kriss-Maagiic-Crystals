import Link from 'next/link';
import { connectMongoose } from '@/lib/mongoose';
import { Order } from '@/models/Order';
import ExportOrdersButton from '@/components/ExportOrdersButton';
import { formatMoney } from '@/lib/money';
import OrdersTableClient from './OrdersTableClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders · Admin' };

interface SP {
  status?: string;
  q?: string;
  delivery?: string; // 'india' | 'abroad'
  customized?: string; // 'true'
  gifting?: string; // 'true'
  from?: string;
  to?: string;
  sort?: string;
}

const SP_LABEL: Record<string, string> = {
  'not-required': '', pending: 'awaiting shipping payment', 'link-sent': 'shipping link sent', paid: 'shipping paid',
};

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'price-high': { total: -1 },
  'price-low': { total: 1 },
};

export default async function AdminOrders(props: PageProps<'/admin/orders'>) {
  const sp = (await props.searchParams) as SP;
  const status = sp.status;
  const delivery = sp.delivery === 'india' || sp.delivery === 'abroad' ? sp.delivery : '';
  const q = sp.q || '';
  const customized = sp.customized === 'true';
  const gifting = sp.gifting === 'true';
  const from = sp.from || '';
  const to = sp.to || '';
  const sort = sp.sort && SORTS[sp.sort] ? sp.sort : 'newest';

  await connectMongoose();

  // 1. Build Filter
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (delivery === 'abroad') filter.international = true;
  if (delivery === 'india') filter.international = { $ne: true };
  if (customized) filter.customizationDetails = { $ne: null };
  if (gifting) filter['customer.giftMessage'] = { $nin: [null, ''] };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(from);
    if (to) { const end = new Date(to); end.setDate(end.getDate() + 1); range.$lt = end; }
    filter.createdAt = range;
  }
  if (q) {
    filter.$or = [
      { orderNumber: { $regex: q, $options: 'i' } },
      { 'customer.name': { $regex: q, $options: 'i' } },
      { 'customer.email': { $regex: q, $options: 'i' } },
      { 'customer.phone': { $regex: q, $options: 'i' } },
    ];
  }

  // 2. Fetch Orders & aggregate summary metrics
  const [orders, countAgg, abroadCount, indiaCount, customizedCount, giftingCount] = await Promise.all([
    Order.find(filter).sort(SORTS[sort]).lean(),
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Order.countDocuments({ international: true }),
    Order.countDocuments({ international: { $ne: true } }),
    Order.countDocuments({ customizationDetails: { $ne: null } }),
    Order.countDocuments({ 'customer.giftMessage': { $nin: [null, ''] } }),
  ]);

  const counts = countAgg.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {} as Record<string, number>);

  const totalCount = countAgg.reduce((sum, curr) => sum + curr.count, 0);
  const qs = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (delivery) params.set('delivery', delivery);
    if (customized) params.set('customized', 'true');
    if (gifting) params.set('gifting', 'true');
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (sort !== 'newest') params.set('sort', sort);
    for (const [k, v] of Object.entries(extra)) { if (v) params.set(k, v); else params.delete(k); }
    const s = params.toString();
    return s ? `/admin/orders?${s}` : '/admin/orders';
  };

  // Client Components can only receive plain objects — strip ObjectIds / Dates / toJSON
  // before handing rows to <ExportOrdersButton> (a 'use client' component).
  const exportRows = orders.map((o) => {
    const ord = o as Record<string, any>;
    const addr = ord.shippingAddress ?? {};
    return {
      orderNumber: ord.orderNumber ?? '',
      createdAt: ord.createdAt ? new Date(ord.createdAt).toISOString() : '',
      status: ord.status ?? '',
      customer: {
        name: ord.customer?.name ?? '',
        email: ord.customer?.email ?? '',
        phone: ord.customer?.phone ?? '',
      },
      items: (ord.items ?? []).map((i: Record<string, any>) => ({
        quantity: i.quantity ?? 1,
        name: i.name ?? '',
      })),
      subtotal: ord.subtotal ?? '',
      shippingCost: ord.shippingCost ?? ord.shipping ?? '',
      total: ord.total ?? '',
      currency: ord.currency ?? 'INR',
      inrAmount: ord.inrAmount,
      shippingAddress: {
        line1: addr.line1 ?? '',
        line2: addr.line2 ?? '',
        city: addr.city ?? '',
        state: addr.state ?? '',
        postalCode: addr.postalCode ?? '',
        country: addr.country ?? '',
      },
      razorpayPaymentId: ord.razorpayPaymentId ?? '',
    };
  });

  const serializedOrders = orders.map((o) => {
    const ord = o as any;
    return {
      ...ord,
      _id: String(ord._id),
      createdAt: ord.createdAt ? new Date(ord.createdAt).toISOString() : '',
    };
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', margin: 0 }}>
          Orders <span style={{ fontSize: '1.1rem', color: '#888', fontWeight: 400 }}>({orders.length} shown)</span>
        </h1>

        {/* Quick Tabs */}
        <div className="d-flex gap-2 flex-wrap">
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => {
            const active = (s === 'all' && !status) || s === status;
            const count = s === 'all' ? totalCount : (counts[s] ?? 0);
            const href = qs({ status: s === 'all' ? '' : s });
            return (
              <Link key={s} href={href} className="crystal-tag" style={{
                background: active ? 'var(--primary,#C8956C)' : 'transparent',
                color: active ? '#fff' : 'inherit',
                border: '1px solid', borderColor: active ? 'var(--primary,#C8956C)' : 'rgba(0,0,0,0.1)',
                textDecoration: 'none', fontWeight: 600,
                fontSize: '0.8rem',
              }}>
                {s} ({count})
              </Link>
            );
          })}
        </div>
      </div>

      {/* Delivery type tabs: India vs Abroad */}
      <div className="d-flex gap-2 flex-wrap mb-3">
        {[
          { key: '', label: '🗂️ All deliveries', count: totalCount },
          { key: 'india', label: '🇮🇳 Indian delivery', count: indiaCount },
          { key: 'abroad', label: '🌍 Abroad delivery', count: abroadCount },
        ].map((d) => {
          const active = d.key === delivery;
          return (
            <Link key={d.key || 'all'} href={qs({ delivery: d.key })} className="crystal-tag" style={{
              background: active ? '#2D1B0E' : 'transparent',
              color: active ? '#fff' : 'inherit',
              border: '1px solid', borderColor: active ? '#2D1B0E' : 'rgba(0,0,0,0.12)',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', padding: '6px 14px',
            }}>{d.label} ({d.count})</Link>
          );
        })}
      </div>

      {/* Customization & Gifting Filter Tabs */}
      <div className="d-flex gap-2 flex-wrap mb-3">
        {[
          { key: 'all', label: '📋 All Orders', count: totalCount },
          { key: 'customized', label: '✨ Customized Bracelet Orders', count: customizedCount },
          { key: 'gifting', label: '🎁 Gift Orders', count: giftingCount },
        ].map((c) => {
          const active = (c.key === 'customized' && customized) || (c.key === 'gifting' && gifting) || (c.key === 'all' && !customized && !gifting);
          
          let href = qs({ customized: '', gifting: '' });
          if (c.key === 'customized') href = qs({ customized: 'true', gifting: '' });
          if (c.key === 'gifting') href = qs({ customized: '', gifting: 'true' });
          
          let bg = 'transparent';
          let border = 'rgba(0,0,0,0.12)';
          if (active) {
            if (c.key === 'customized') { bg = '#8A3FB2'; border = '#8A3FB2'; }
            else if (c.key === 'gifting') { bg = '#D95F7A'; border = '#D95F7A'; }
            else { bg = '#2D1B0E'; border = '#2D1B0E'; }
          }
          
          return (
            <Link key={c.key} href={href} className="crystal-tag" style={{
              background: bg,
              color: active ? '#fff' : 'inherit',
              border: '1px solid', borderColor: border,
              textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', padding: '6px 14px',
            }}>{c.label} ({c.count})</Link>
          );
        })}
      </div>

      {/* Search Bar */}
      <div style={{ background: '#fff', padding: '1rem', borderRadius: 14, marginBottom: '1rem', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
        <form method="GET" action="/admin/orders">
          {customized && <input type="hidden" name="customized" value="true" />}
          {gifting && <input type="hidden" name="gifting" value="true" />}

          {/* Row 1 — Search + Status + Delivery + From + To */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
            <div style={{ flex: '2 1 220px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Search</label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: '0.9rem' }}></i>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Customer name, email, phone, order #..."
                  className="newsletter-input"
                  style={{ width: '100%', paddingLeft: '34px', height: 42 }}
                />
              </div>
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Delivery</label>
              <select name="delivery" defaultValue={delivery} className="newsletter-input" style={{ height: 42, width: '100%' }}>
                <option value="">All</option>
                <option value="india">🇮🇳 India</option>
                <option value="abroad">🌍 Abroad</option>
              </select>
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>From</label>
              <input type="date" name="from" defaultValue={from} className="newsletter-input" style={{ height: 42, width: '100%' }} />
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>To</label>
              <input type="date" name="to" defaultValue={to} className="newsletter-input" style={{ height: 42, width: '100%' }} />
            </div>
          </div>

          {/* Row 2 — Sort + buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Sort by</label>
              <select name="sort" defaultValue={sort} className="newsletter-input" style={{ height: 42, width: '100%' }}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price-high">Price: high → low</option>
                <option value="price-low">Price: low → high</option>
              </select>
            </div>

            <button type="submit" className="btn-primary-custom" style={{ padding: '0 32px', height: '42px', flex: '1 1 auto', maxWidth: 160 }}>
              Apply
            </button>

            {(q || delivery || from || to || sort !== 'newest') && (
              <Link href="/admin/orders" className="btn-outline-custom" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '42px', padding: '0 16px', textDecoration: 'none' }}>
                Reset
              </Link>
            )}

            <ExportOrdersButton orders={exportRows} />
          </div>
        </form>
      </div>

      <OrdersTableClient orders={serializedOrders} />
    </div>
  );
}
