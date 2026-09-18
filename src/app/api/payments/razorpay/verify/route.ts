import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectMongoose } from '@/lib/mongoose';
import { Order } from '@/models/Order';
import { fulfillPaidOrder } from '@/lib/orderFulfillment';
import { isRazorpayConfigured, verifyPaymentSignature } from '@/lib/razorpay';
import { getInrEquivalent } from '@/lib/money';
import { razorpayVerifySchema, zodErrorMessage } from '@/lib/validators';

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

  const parsed = razorpayVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: zodErrorMessage(parsed.error) }, { status: 400 });
  }

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  await connectMongoose();
  let order = null;

  const isObjectId = /^[a-f0-9]{24}$/i.test(orderId);
  if (isObjectId) {
    order = await Order.findOne({ _id: orderId, user: session.user.id });
  } else if (orderId.startsWith('order_')) {
    order = await Order.findOne({ razorpayOrderId: orderId, user: session.user.id });
  } else {
    let orderNumber = orderId;
    if (orderNumber.startsWith('KMC-')) {
      orderNumber = orderNumber.substring(4);
    }
    if (orderNumber.startsWith('KMC-')) {
      orderNumber = orderNumber.substring(4);
    }
    order = await Order.findOne({ orderNumber: `KMC-${orderNumber}`, user: session.user.id });
  }

  if (!order) {
    return NextResponse.json({ ok: false, reason: 'order-not-found' }, { status: 404 });
  }

  if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
    // Signature-based verification (checkout callback verification)
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ ok: false, reason: 'invalid-signature' }, { status: 400 });
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        orderId: String(order._id),
        alreadyPaid: true,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping ?? 0,
        total: order.total && order.total > 0 ? order.total : order.subtotal,
        international: order.international ?? false,
        currency: order.currency || 'INR',
      });
    }

    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.razorpayPaymentId = razorpay_payment_id;
    order.inrAmount = getInrEquivalent(order.total, order.currency);
    if (!order.razorpayOrderId) {
      order.razorpayOrderId = razorpay_order_id;
    }
    await order.save();
    await fulfillPaidOrder(order);

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping ?? 0,
      total: order.total && order.total > 0 ? order.total : order.subtotal,
      international: order.international ?? false,
      currency: order.currency || 'INR',
    });
  } else {
    // Status-lookup based verification (success redirection page check)
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        orderId: String(order._id),
        alreadyPaid: true,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping ?? 0,
        total: order.total && order.total > 0 ? order.total : order.subtotal,
        international: order.international ?? false,
        currency: order.currency || 'INR',
      });
    }

    if (!order.razorpayOrderId) {
      return NextResponse.json({ ok: false, reason: 'no-online-payment-started' }, { status: 400 });
    }

    const { getRazorpayOrderStatus } = await import('@/lib/razorpay');
    let orderStatus: string;
    let razorpayPaymentId: string | undefined;
    try {
      const result = await getRazorpayOrderStatus(order.razorpayOrderId);
      orderStatus = result.orderStatus;
      razorpayPaymentId = result.razorpayPaymentId;
    } catch (err) {
      console.error('[razorpay] status check failed', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, reason: `razorpay-status-error: ${errMsg}` }, { status: 502 });
    }

    if (orderStatus !== 'paid') {
      return NextResponse.json(
        { ok: false, reason: `payment-not-confirmed (status: ${orderStatus})` },
        { status: 400 }
      );
    }

    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.razorpayPaymentId = razorpayPaymentId || undefined;
    await order.save();
    await fulfillPaidOrder(order);

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping ?? 0,
      total: order.total && order.total > 0 ? order.total : order.subtotal,
      international: order.international ?? false,
      currency: order.currency || 'INR',
    });
  }
}
