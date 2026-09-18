import { NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import { Order } from '@/models/Order';
import { Booking } from '@/models/Booking';
import { fulfillPaidOrder } from '@/lib/orderFulfillment';
import { fulfillPaidBooking } from '@/lib/bookingFulfillment';
import { verifyRazorpayWebhook } from '@/lib/razorpay';
import { getInrEquivalent } from '@/lib/money';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!signature || !verifyRazorpayWebhook(rawBody, signature)) {
    console.warn('[razorpay webhook] invalid signature');
    return NextResponse.json({ ok: false, reason: 'invalid-signature' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ ok: false, reason: 'invalid-json' }, { status: 400 });
  }

  if (event.event !== 'order.paid' && event.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const razorpayOrderId = event.payload.order?.entity?.id || event.payload.payment?.entity?.order_id;
  const razorpayPaymentId = event.payload.payment?.entity?.id;
  const paymentEntity = event.payload.payment?.entity;
  const baseAmountPaise = paymentEntity?.base_amount || (paymentEntity?.currency === 'INR' ? paymentEntity?.amount : undefined);
  const settledInr = baseAmountPaise ? Math.round(baseAmountPaise / 100) : undefined;

  if (!razorpayOrderId) {
    return NextResponse.json({ ok: false, reason: 'missing-order-id' }, { status: 400 });
  }

  await connectMongoose();

  // Try shop order first
  const order = await Order.findOne({ razorpayOrderId });
  if (order) {
    if (order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.razorpayPaymentId = razorpayPaymentId || null;
      order.inrAmount = settledInr || getInrEquivalent(order.total, order.currency);
      await order.save();
      await fulfillPaidOrder(order);
      console.log('[razorpay webhook] order fulfilled', order.orderNumber);
      return NextResponse.json({ ok: true });
    } else if (!order.razorpayPaymentId && razorpayPaymentId) {
      order.razorpayPaymentId = razorpayPaymentId;
      if (!order.inrAmount) {
        order.inrAmount = settledInr || getInrEquivalent(order.total, order.currency);
      }
      await order.save();
      console.log('[razorpay webhook] order payment ID updated', order.orderNumber);
      return NextResponse.json({ ok: true });
    }
  }

  // Try booking
  const booking = await Booking.findOne({ razorpayOrderId });
  if (booking) {
    if (booking.paymentStatus !== 'paid') {
      booking.paymentStatus = 'paid';
      booking.status = 'booked';
      booking.razorpayPaymentId = razorpayPaymentId;
      booking.inrAmount = settledInr || getInrEquivalent(booking.servicePrice, booking.currency);
      await booking.save();
      await fulfillPaidBooking(booking);
      console.log('[razorpay webhook] booking fulfilled', booking.bookingNumber);
      return NextResponse.json({ ok: true });
    } else if (!booking.razorpayPaymentId && razorpayPaymentId) {
      booking.razorpayPaymentId = razorpayPaymentId;
      if (!booking.inrAmount) {
        booking.inrAmount = settledInr || getInrEquivalent(booking.servicePrice, booking.currency);
      }
      await booking.save();
      console.log('[razorpay webhook] booking payment ID updated', booking.bookingNumber);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true, skipped: true });
}
