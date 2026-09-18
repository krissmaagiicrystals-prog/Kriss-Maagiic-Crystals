import Link from 'next/link';
import { connectMongoose } from '@/lib/mongoose';
import { Booking } from '@/models/Booking';
import ExportBookingsButton from '@/components/ExportBookingsButton';
import BookingsTableClient from './BookingsTableClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bookings · Admin' };

interface SP {
  status?: string;
  q?: string;
  service?: string;
  payment?: string;
  from?: string;
  to?: string;
  sort?: string;
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'event-date': { date: -1, timeSlot: -1 },
  'price-high': { servicePrice: -1 },
  'price-low': { servicePrice: 1 },
};

export default async function AdminBookings(props: PageProps<'/admin/bookings'>) {
  const sp = (await props.searchParams) as SP;
  const status = sp.status;
  const q = sp.q || '';
  const service = sp.service || '';
  const payment = sp.payment || '';
  const from = sp.from || '';
  const to = sp.to || '';
  const sort = sp.sort && SORTS[sp.sort] ? sp.sort : 'newest';

  await connectMongoose();

  // 1. Build Filter
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (service) filter.serviceTitle = service;
  if (payment === 'paid') filter.paymentStatus = 'paid';
  if (payment === 'unpaid') filter.paymentStatus = { $ne: 'paid' };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(from);
    if (to) { const end = new Date(to); end.setDate(end.getDate() + 1); range.$lt = end; }
    filter.createdAt = range;
  }
  if (q) {
    filter.$or = [
      { bookingNumber: { $regex: q, $options: 'i' } },
      { serviceTitle: { $regex: q, $options: 'i' } },
      { 'customer.name': { $regex: q, $options: 'i' } },
      { 'customer.email': { $regex: q, $options: 'i' } },
      { 'customer.phone': { $regex: q, $options: 'i' } },
    ];
  }

  // 2. Fetch data & compile status counts + distinct services for the filter dropdown
  const [bookings, countAgg, serviceTitles] = await Promise.all([
    Booking.find(filter).sort(SORTS[sort]).lean(),
    Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Booking.distinct('serviceTitle'),
  ]);

  const counts = countAgg.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {} as Record<string, number>);

  const totalCount = countAgg.reduce((sum, curr) => sum + curr.count, 0);

  // Client Components can only receive plain objects — strip ObjectIds / Dates / toJSON
  // before handing the rows to <ExportBookingsButton> (a 'use client' component).
  const exportRows = bookings.map((b) => ({
    bookingNumber: b.bookingNumber ?? '',
    date: b.date ?? '',
    timeSlot: b.timeSlot ?? '',
    status: b.status ?? '',
    serviceTitle: b.serviceTitle ?? '',
    serviceType: (b as { serviceType?: string }).serviceType ?? '',
    customer: {
      name: b.customer?.name ?? '',
      email: b.customer?.email ?? '',
      phone: b.customer?.phone ?? '',
      age: (b.customer as { age?: string | number })?.age ?? '',
    },
    amountPaid: (b as { amountPaid?: number }).amountPaid ?? b.servicePrice ?? '',
    currency: b.currency ?? 'INR',
    inrAmount: b.inrAmount,
    answers: null,
    razorpayPaymentId: b.razorpayPaymentId ?? '',
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : '',
  }));

  const serializedBookings = bookings.map((b) => {
    const book = b as any;
    return {
      ...book,
      _id: String(book._id),
      createdAt: book.createdAt ? new Date(book.createdAt).toISOString() : '',
      date: book.date && book.date !== 'N/A' ? new Date(book.date).toISOString() : 'N/A',
    };
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', margin: 0 }}>
          Bookings <span style={{ fontSize: '1.1rem', color: '#888', fontWeight: 400 }}>({bookings.length} shown)</span>
        </h1>

        {/* Quick Tabs */}
        <div className="d-flex gap-2 flex-wrap">
          {['all', 'pending', 'booked', 'in_progress', 'completed', 'cancelled', 'approved', 'rejected'].map((s) => {
            const active = (s === 'all' && !status) || s === status;
            const count = s === 'all' ? totalCount : (counts[s] ?? 0);
            const params = new URLSearchParams();
            if (s !== 'all') params.set('status', s);
            if (q) params.set('q', q);
            if (service) params.set('service', service);
            if (payment) params.set('payment', payment);
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            if (sort !== 'newest') params.set('sort', sort);
            const qs = params.toString();
            const href = qs ? `/admin/bookings?${qs}` : '/admin/bookings';
            return (
              <Link key={s} href={href} className="crystal-tag" style={{
                background: active ? 'var(--primary,#C8956C)' : 'transparent',
                color: active ? '#fff' : 'inherit',
                border: '1px solid', borderColor: active ? 'var(--primary,#C8956C)' : 'rgba(0,0,0,0.1)',
                textDecoration: 'none', fontWeight: 600,
                fontSize: '0.8rem',
              }}>{s} ({count})</Link>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ background: '#fff', padding: '1rem', borderRadius: 14, marginBottom: '1rem', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
        <form method="GET" action="/admin/bookings" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {status && <input type="hidden" name="status" value={status} />}
          
          <div style={{ flex: '2 1 280px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Search</label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, bottom: 13, color: '#aaa', fontSize: '0.9rem' }}></i>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by customer, service, or booking #..."
                className="newsletter-input"
                style={{ width: '100%', paddingLeft: '34px', height: 42 }}
              />
            </div>
          </div>

          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Service</label>
            <select name="service" defaultValue={service} className="newsletter-input" style={{ height: 42, width: '100%' }}>
              <option value="">All services</option>
              {serviceTitles.sort().map((s: string) => (
                <option key={s} value={s}>{s.length > 40 ? s.slice(0, 40) + '…' : s}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 110px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Payment</label>
            <select name="payment" defaultValue={payment} className="newsletter-input" style={{ height: 42, width: '100%' }}>
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
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

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Sort by</label>
            <select name="sort" defaultValue={sort} className="newsletter-input" style={{ height: 42, width: '100%' }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="event-date">Event date</option>
              <option value="price-high">Price: high → low</option>
              <option value="price-low">Price: low → high</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
            <button type="submit" className="btn-primary-custom" style={{ padding: '0 24px', height: '42px', minWidth: '80px', flex: '1 1 auto' }}>
              Apply
            </button>

            {(q || status || service || payment || from || to || sort !== 'newest') && (
              <Link href="/admin/bookings" className="btn-outline-custom" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '42px', padding: '0 16px', textDecoration: 'none', flex: '1 1 auto' }}>
                Reset
              </Link>
            )}

            <ExportBookingsButton bookings={exportRows} />
          </div>
        </form>
      </div>

      <BookingsTableClient bookings={serializedBookings} />
    </div>
  );
}
