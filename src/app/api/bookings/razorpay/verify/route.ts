import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectMongoose } from '@/lib/mongoose';
import { Booking } from '@/models/Booking';
import { isRazorpayConfigured, verifyPaymentSignature } from '@/lib/razorpay';
import { fulfillPaidBooking } from '@/lib/bookingFulfillment';
import { getInrEquivalent } from '@/lib/money';
import { z } from 'zod';

const verifySchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  razorpay_order_id: z.string().min(1, "Razorpay Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay Payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay Signature is required"),
});

export async function POST(req: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ ok: false, reason: 'razorpay-not-configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'invalid-input' }, { status: 400 });
  }

  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ ok: false, reason: 'invalid-signature' }, { status: 400 });
  }

  await connectMongoose();
  const booking = await Booking.findOne({
    _id: bookingId,
    user: session.user.id,
    razorpayOrderId: razorpay_order_id,
  });

  if (!booking) {
    return NextResponse.json({ ok: false, reason: 'booking-not-found' }, { status: 404 });
  }

  if (booking.paymentStatus === 'paid') {
    return NextResponse.json({
      ok: true,
      bookingNumber: booking.bookingNumber,
      bookingId: String(booking._id),
      alreadyPaid: true,
    });
  }

  booking.paymentStatus = 'paid';
  booking.status = 'booked';
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.inrAmount = getInrEquivalent(booking.servicePrice, booking.currency);
  await booking.save();

  await fulfillPaidBooking(booking);

  return NextResponse.json({
    ok: true,
    bookingNumber: booking.bookingNumber,
    bookingId: String(booking._id),
  });
}
