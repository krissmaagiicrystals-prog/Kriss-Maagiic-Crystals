import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectMongoose } from '@/lib/mongoose';
import { Booking } from '@/models/Booking';
import { Service } from '@/models/Service';
import { formatMoney } from '@/lib/money';
import BookingDecisionForm from './BookingDecisionForm';
import ConfirmPaymentButton from '@/app/admin/ConfirmPaymentButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Booking Review · Admin' };

export default async function AdminBookingDetail(props: PageProps<'/admin/bookings/[id]'>) {
  const { id } = await props.params;
  await connectMongoose();
  const b = await Booking.findById(id).lean();
  if (!b) notFound();

  // Query service details to get the image
  const s = await Service.findById(b.service).select('image tagline').lean();
  const serviceImage = s?.image || '/images/products/bracelet.png';
  const tagline = s?.tagline || '';

  return (
    <div>
      <Link href="/admin/bookings" style={{ color: 'var(--primary,#C8956C)', fontSize: '0.85rem' }}>← All bookings</Link>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginTop: 12 }}>{b.bookingNumber}</h1>
      <p style={{ color: '#888' }}>Submitted {new Date(b.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · <strong>{b.currency && b.currency !== 'INR' ? '🌍 Abroad' : '🇮🇳 India'}</strong> booking · Current status: <strong>{b.status}</strong></p>

      <div className="row g-4 mt-2">
        <div className="col-lg-7">
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>Service</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <img
                src={serviceImage}
                alt={b.serviceTitle}
                width="64"
                height="64"
                style={{ borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.05)', background: '#FAF6F1' }}
              />
              <div>
                <strong style={{ fontSize: '1.05rem', color: '#2D1B0E', display: 'block' }}>{b.serviceTitle}</strong>
                {tagline && <span style={{ fontSize: '0.78rem', color: '#888', fontStyle: 'italic', display: 'block', marginTop: 2 }}>{tagline}</span>}
              </div>
            </div>
            <p style={{ fontSize: '0.95rem', margin: '8px 0 0 0' }}>
              <strong>Price:</strong> {formatMoney(b.servicePrice, b.currency)}<br />
              <strong>Schedule:</strong> {b.date !== 'N/A' ? (
                <><strong>{b.date}</strong> at <strong>{b.timeSlot}</strong></>
              ) : (
                <strong style={{ color: '#888' }}>Unscheduled / Async</strong>
              )}
            </p>
            <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginTop: 16 }}>Payment</h5>
            <p style={{ fontSize: '0.9rem' }}>
              Status: <span className="crystal-tag status-tag">{b.paymentStatus || 'unpaid'}</span><br />
              {b.cfOrderId && <><strong>CF Order:</strong> {b.cfOrderId}<br /></>}
              {b.cfPaymentId && <><strong>CF Payment:</strong> {b.cfPaymentId}</>}
              {!b.cfPaymentId && b.razorpayPaymentId && <><strong>Razorpay (legacy):</strong> {b.razorpayPaymentId}</>}
            </p>
            {(b.paymentStatus || 'unpaid') !== 'paid' && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 12 }}>
                  If the customer paid but the status still shows unpaid, click below. We&apos;ll check with Razorpay and mark it paid only if the payment is confirmed — then send the confirmation email.
                </p>
                <ConfirmPaymentButton kind="booking" id={String(b._id)} />
              </div>
            )}
            {b.question && (
              <>
                <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginTop: 16 }}>Specific Question</h5>
                <p style={{ background: '#FAF6F1', padding: 12, borderRadius: 8, fontSize: '0.9rem' }}>{b.question}</p>
              </>
            )}
            {b.intention && (
              <>
                <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginTop: 16 }}>Intention</h5>
                <p style={{ background: '#FAF6F1', padding: 12, borderRadius: 8, fontSize: '0.9rem' }}>{b.intention}</p>
              </>
            )}
            {b.dob && (
              <>
                <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginTop: 16 }}>Date of Birth</h5>
                <p style={{ background: '#FAF6F1', padding: 12, borderRadius: 8, fontSize: '0.9rem' }}>{b.dob}</p>
              </>
            )}
            {b.notes && (
              <>
                <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginTop: 16 }}>Customer Notes</h5>
                <p style={{ background: '#FAF6F1', padding: 12, borderRadius: 8, fontSize: '0.9rem' }}>{b.notes}</p>
              </>
            )}
            <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginTop: 16 }}>Customer</h5>
            <p style={{ fontSize: '0.9rem' }}>{b.customer.name}<br />{b.customer.email}<br />{b.customer.phone}</p>
          </div>
        </div>
        <div className="col-lg-5">
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>Decision</h4>
            <BookingDecisionForm bookingId={String(b._id)} current={b.status} note={b.adminNote || ''} />
          </div>
        </div>
      </div>
    </div>
  );
}
