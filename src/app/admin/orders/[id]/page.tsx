import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectMongoose } from '@/lib/mongoose';
import { Order } from '@/models/Order';
import { Product } from '@/models/Product';
import { resolveProductImage } from '@/lib/resolveProductImage';
import OrderStatusForm from './OrderStatusForm';
import ShippingPaymentForm from './ShippingPaymentForm';
import MarkAbroadButton from './MarkAbroadButton';
import ConfirmPaymentButton from '@/app/admin/ConfirmPaymentButton';
import { formatMoney, currencySymbol } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order Detail · Admin' };

export default async function AdminOrderDetail(props: PageProps<'/admin/orders/[id]'>) {
  const { id } = await props.params;
  await connectMongoose();
  const order = await Order.findById(id).lean();
  if (!order) notFound();
  const cur = order.currency || 'INR';

  // Query products to get images and details
  const slugs = order.items.map(i => i.productSlug);
  const products = await Product.find({ slug: { $in: slugs } }).select('slug category image name').lean();
  const productMap = new Map(products.map(p => [p.slug, p]));

  return (
    <div>
      <Link href="/admin/orders" style={{ color: 'var(--primary,#C8956C)', fontSize: '0.85rem' }}>← All orders</Link>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginTop: 12 }}>
        {order.orderNumber}
      </h1>
      <p style={{ color: '#888' }}>
        Placed {new Date(order.createdAt).toLocaleString('en-IN')}
        {' · '}<strong>{order.international ? '🌍 Abroad' : '🇮🇳 India'}</strong> delivery · paid in <strong>{cur}</strong>
        {' · '}Status: <strong>{order.status}</strong>
        {order.paymentStatus && (
          <> · Payment: <strong>{order.paymentStatus}</strong></>
        )}
        {order.cfPaymentId && (
          <> · Cashfree: <code style={{ fontSize: '0.8rem' }}>{order.cfPaymentId}</code></>
        )}
        {!order.cfPaymentId && order.razorpayPaymentId && (
          <> · Razorpay (legacy): <code style={{ fontSize: '0.8rem' }}>{order.razorpayPaymentId}</code></>
        )}
      </p>

      <div className="row g-4 mt-2">
        <div className="col-lg-8">
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>Items</h4>
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Product</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Price</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i, idx) => {
                  const p = productMap.get(i.productSlug);
                  const imageSrc = p ? resolveProductImage(p.image, p.category, p.name) : '/images/products/bracelet.png';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={imageSrc}
                          alt={i.name}
                          width="44"
                          height="44"
                          style={{ borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.05)', background: '#FAF6F1' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{i.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>{i.productSlug}</span>
                            {i.size && (
                              <span style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(200, 149, 108, 0.12)',
                                color: 'var(--primary,#C8956C)',
                                fontWeight: 700,
                                fontSize: '0.7rem'
                              }}>
                                Size: {i.size}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', verticalAlign: 'middle' }}>{formatMoney(i.price, cur)}</td>
                      <td style={{ padding: 8, textAlign: 'right', verticalAlign: 'middle' }}>{i.qty}</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600, verticalAlign: 'middle' }}>{formatMoney(i.lineTotal, cur)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} style={{ padding: '8px', textAlign: 'right', color: '#666' }}>Subtotal</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{formatMoney(order.subtotal, cur)}</td></tr>
                <tr><td colSpan={3} style={{ padding: '2px 8px', textAlign: 'right', color: '#666' }}>Shipping</td>
                  <td style={{ padding: '2px 8px', textAlign: 'right' }}>
                    {order.international ? <em style={{ color: '#888' }}>billed separately</em> : (order.shipping ? formatMoney(order.shipping, cur) : 'Free')}
                  </td></tr>
                <tr><td colSpan={3} style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>Total{order.international ? ' (excl. shipping)' : ''}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>{formatMoney(order.total && order.total > 0 ? order.total : order.subtotal, cur)}</td></tr>
              </tfoot>
            </table>
          </div>

          {order.customizationDetails && (
            <div className="mt-4" style={{
              background: '#fff',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              border: '1.5px solid rgba(138, 63, 178, 0.25)'
            }}>
              <h4 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.15rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#8A3FB2'
              }}>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                Custom Bracelet Specifications
              </h4>

              <div style={{ display: 'grid', gap: '16px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  <div>
                    <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Preferred Wrist Size</span>
                    <strong style={{ fontSize: '0.95rem', color: '#2D1B0E' }}>{(order.customizationDetails as any).wristSize || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Preferred Bead Size</span>
                    <strong style={{ fontSize: '0.95rem', color: '#2D1B0E' }}>{(order.customizationDetails as any).beadSize || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Option Chosen</span>
                    <strong style={{ fontSize: '0.95rem', color: '#2D1B0E' }}>{(order.customizationDetails as any).option || 'N/A'}</strong>
                  </div>
                </div>

                <hr style={{ margin: '8px 0', borderColor: 'rgba(0,0,0,0.05)' }} />

                {/* Option 1: Know my crystals details */}
                {((order.customizationDetails as any).selectedCrystals && (order.customizationDetails as any).selectedCrystals.length > 0) ? (
                  <div>
                    <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '6px' }}>Selected Crystals</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {((order.customizationDetails as any).selectedCrystals as string[]).map((c: string) => (
                        <span key={c} style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(138, 63, 178, 0.08)',
                          color: '#8A3FB2',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Option 2: Help me choose details */}
                {((order.customizationDetails as any).supportAreas && (order.customizationDetails as any).supportAreas.length > 0) ? (
                  <div>
                    <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '6px' }}>Support Areas requested</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {((order.customizationDetails as any).supportAreas as string[]).map((s: string) => (
                        <span key={s} style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(155, 89, 182, 0.08)',
                          color: '#9B59B6',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {((order.customizationDetails as any).highestPriority) ? (
                  <div>
                    <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Highest Priority Area</span>
                    <strong style={{ fontSize: '0.95rem', color: '#2D1B0E' }}>{(order.customizationDetails as any).highestPriority}</strong>
                  </div>
                ) : null}

                {((order.customizationDetails as any).intentionDescription) ? (
                  <div>
                    <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Described Intention</span>
                    <p style={{ 
                      margin: 0, 
                      padding: '12px', 
                      background: '#FAF6F1', 
                      borderRadius: '8px', 
                      fontStyle: 'italic', 
                      color: '#2D1B0E',
                      lineHeight: 1.6,
                      borderLeft: '3px solid #8A3FB2'
                    }}>
                      "{(order.customizationDetails as any).intentionDescription}"
                    </p>
                  </div>
                ) : null}

                {((order.customizationDetails as any).additionalNotes) ? (
                  <div>
                    <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Additional Customization Notes</span>
                    <p style={{ 
                      margin: 0, 
                      padding: '12px', 
                      background: '#FAF6F1', 
                      borderRadius: '8px', 
                      fontStyle: 'italic', 
                      color: '#2D1B0E',
                      lineHeight: 1.6,
                      borderLeft: '3px solid #8A3FB2'
                    }}>
                      "{(order.customizationDetails as any).additionalNotes}"
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {order.international && (
            <div className="mt-4" style={{ 
              background: '#fff', 
              borderRadius: 14, 
              padding: '24px 20px', 
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)', 
              border: '1px solid rgba(200,149,108,0.25)' 
            }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-earth-asia" style={{ color: 'var(--primary,#C8956C)' }}></i>
                International Shipping Payment
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 20 }}>
                Generate a payment link externally and send it to the customer ({order.customer.country}).
              </p>
              <ShippingPaymentForm
                orderId={String(order._id)}
                currencySymbol={currencySymbol(cur)}
                initial={{
                  status: order.shippingPayment?.status || 'pending',
                  link: order.shippingPayment?.link ?? '',
                  amount: order.shippingPayment?.amount ?? null,
                  note: order.shippingPayment?.note ?? '',
                  sentAt: order.shippingPayment?.sentAt ? String(order.shippingPayment.sentAt) : null,
                  paidAt: order.shippingPayment?.paidAt ? String(order.shippingPayment.paidAt) : null,
                }}
              />
            </div>
          )}
        </div>
        <div className="col-lg-4">
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>Customer</h4>
            <p style={{ fontSize: '0.9rem' }}>
              <strong>{order.customer.name}</strong><br />
              {order.customer.email}<br />
              {order.customer.phone}<br />
              <br />
              {order.customer.address}<br />
              {order.customer.city}, {order.customer.state} {order.customer.pincode}
              {order.customer.dob && (<><br /><br /><em>Date of Birth:</em> {order.customer.dob}</>)}
              {order.customer.notes && (<><br /><br /><em>Notes:</em> {order.customer.notes}</>)}
            </p>
          </div>

          {(order.customer as any).giftMessage && (
            <div className="mt-3" style={{
              background: 'linear-gradient(135deg, #fff5f7 0%, #fff 100%)',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 4px 14px rgba(232,143,160,0.15)',
              border: '2px solid rgba(232,143,160,0.5)',
            }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: '#e88fa0',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                }}>
                  <i className="fa-solid fa-gift me-1"></i>
                  GIFT ORDER
                </span>
              </h4>

              <div style={{
                background: '#fffbfc',
                border: '1.5px dashed rgba(232,143,160,0.5)',
                borderRadius: 10,
                padding: '14px 16px',
                marginTop: 12,
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c45e77', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  <i className="fa-solid fa-envelope-open-text me-1"></i>
                  Gift Card Message — Write this on the card when packing
                </div>
                {(order.customer as any).giftRecipient && (
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}>
                    For: <strong>{(order.customer as any).giftRecipient}</strong>
                  </div>
                )}
                <p style={{
                  fontStyle: 'italic',
                  fontSize: '1rem',
                  color: '#2D1B0E',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  lineHeight: 1.7,
                  borderLeft: '3px solid #e88fa0',
                  paddingLeft: 12,
                }}>
                  &ldquo;{(order.customer as any).giftMessage}&rdquo;
                </p>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#a07080', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#e88fa0' }}></i>
                Include a handwritten gift card with the message above before shipping
              </p>
            </div>
          )}

          <div className="mt-3" style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>Update status</h4>
            <OrderStatusForm orderId={String(order._id)} current={order.status} note={order.adminNote || ''} />
          </div>

          {order.paymentStatus !== 'paid' && (
            <div className="mt-3" style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(43,122,92,0.2)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', color: '#2B7A5C', marginBottom: 12 }}>
                <i className="fa-solid fa-circle-check me-2"></i>Payment
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 16 }}>
                If the customer paid but the status still shows unpaid, click below. We&apos;ll check with Razorpay and mark it paid only if the payment is confirmed — then send the confirmation email.
              </p>
              <ConfirmPaymentButton kind="order" id={String(order._id)} />
            </div>
          )}

          {!order.international && (
            <div className="mt-3" style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>
                <i className="fa-solid fa-truck me-2" style={{ color: 'var(--primary,#C8956C)' }}></i>
                Delivery
              </h4>
              <MarkAbroadButton orderId={String(order._id)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
