import Link from 'next/link';
import { connectMongoose } from '@/lib/mongoose';
import { Order } from '@/models/Order';
import { Booking } from '@/models/Booking';
import { Product } from '@/models/Product';
import { User } from '@/models/User';
import DashboardCharts from './DashboardCharts';
import MonthlyExport from './MonthlyExport';
import DashboardFilter from './DashboardFilter';
import { formatMoney, getInrEquivalent } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard · Admin' };

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  href?: string;
}

async function loadDashboardData(month?: number, year?: number) {
  try {
    await connectMongoose();

    // Build date range filter if month/year specified
    let dateFilter: { $gte: Date; $lt: Date } | null = null;
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      dateFilter = { $gte: start, $lt: end };
    }

    const dateMatch = dateFilter ? { createdAt: dateFilter } : {};

    const [
      totalOrders,
      pendingOrders,
      totalBookings,
      pendingBookings,
      productsLiveCount,
      usersCount,
      recentOrders,
      recentBookings,
      paidOrders,
      paidBookings,
    ] = await Promise.all([
      Order.countDocuments(dateMatch),
      Order.countDocuments({ status: 'pending', ...dateMatch }),
      Booking.countDocuments(dateMatch),
      Booking.countDocuments({ status: 'pending', ...dateMatch }),
      Product.countDocuments({ active: true, isDeleted: { $ne: true } }),
      User.countDocuments(),
      Order.find(dateMatch).sort({ createdAt: -1 }).limit(5).lean(),
      Booking.find(dateMatch).sort({ createdAt: -1 }).limit(5).lean(),
      Order.find({ paymentStatus: 'paid', ...dateMatch }).select('total subtotal currency inrAmount createdAt').lean(),
      Booking.find({ paymentStatus: 'paid', ...dateMatch }).select('servicePrice currency inrAmount createdAt').lean(),
    ]);

    // Calculate Paid Revenue in INR (paid orders + paid bookings converted to INR)
    const orderRevenue = paidOrders.reduce((s, o) => s + getInrEquivalent(o.total || o.subtotal || 0, o.currency, o.inrAmount), 0);
    const bookingRevenue = paidBookings.reduce((s, b) => s + getInrEquivalent(b.servicePrice || 0, b.currency, b.inrAmount), 0);
    const revenue = orderRevenue + bookingRevenue;

    // Trend window: if filtering by month use that month's days, else last 30 days
    let trendStart: Date;
    let days: string[];
    if (dateFilter) {
      trendStart = dateFilter.$gte;
      const daysInMonth = new Date(dateFilter.$lt.getTime() - 1).getDate();
      days = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(trendStart);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      });
    } else {
      trendStart = new Date();
      trendStart.setDate(trendStart.getDate() - 30);
      days = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }
    }

    // Sales Trend (Paid Revenue in INR by day)
    const trendOrders = await Order.find({
      paymentStatus: 'paid',
      createdAt: dateFilter ?? { $gte: trendStart },
    }).select('total subtotal currency inrAmount createdAt').lean();

    const salesMap = new Map<string, number>();
    for (const o of trendOrders) {
      const day = new Date(o.createdAt).toISOString().split('T')[0];
      const val = getInrEquivalent(o.total || o.subtotal || 0, o.currency, o.inrAmount);
      salesMap.set(day, (salesMap.get(day) || 0) + val);
    }

    // Bookings Trend by day
    const bookingsTrendRaw = await Booking.aggregate([
      {
        $match: {
          createdAt: dateFilter ?? { $gte: trendStart },
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const bookingsMap = new Map(bookingsTrendRaw.map((b) => [b._id, b.count]));

    const dailyMetrics = days.map((day) => {
      const dateObj = new Date(day);
      return {
        day: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: salesMap.get(day) ?? 0,
        bookings: bookingsMap.get(day) ?? 0,
      };
    });

    // Category Sales breakdown
    const categorySalesRaw = await Order.aggregate([
      { $match: { paymentStatus: 'paid', ...dateMatch } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productSlug',
          revenue: { $sum: '$items.lineTotal' }
        }
      }
    ]);

    // Load products category map to map categories in-memory
    const allProducts = await Product.find({}, 'slug category').lean();
    const prodCategoryMap = new Map(allProducts.map((p) => [p.slug, p.category]));

    const categoryRevenueMap: Record<string, number> = {};
    for (const item of categorySalesRaw) {
      const category = prodCategoryMap.get(item._id) ?? 'other';
      categoryRevenueMap[category] = (categoryRevenueMap[category] ?? 0) + item.revenue;
    }

    const categorySummary = Object.entries(categoryRevenueMap)
      .map(([category, rev]) => ({
        category: category.toUpperCase(),
        revenue: rev,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalOrders,
      pendingOrders,
      totalBookings,
      pendingBookings,
      productsLiveCount,
      usersCount,
      revenue,
      orderRevenue,
      bookingRevenue,
      recentOrders,
      recentBookings,
      dailyMetrics,
      categorySummary,
    };
  } catch (err) {
    console.error('admin loadStats failed', err);
    return null;
  }
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const filterMonth = sp.month ? Number(sp.month) : undefined;
  const filterYear = sp.year ? Number(sp.year) : undefined;
  const stats = await loadDashboardData(filterMonth, filterYear);

  if (!stats) {
    return <p>Could not load dashboard stats. Check DB connection.</p>;
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const periodLabel = filterMonth
    ? `${MONTHS[filterMonth - 1]} ${filterYear ?? new Date().getFullYear()}`
    : 'All Time';

  const cards: StatCard[] = [
    { label: 'Pending Bookings', value: stats.pendingBookings, icon: 'fa-solid fa-hourglass-half', color: '#C8956C', href: '/admin/bookings?status=pending' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: 'fa-solid fa-bag-shopping', color: '#C9A84C', href: '/admin/orders?status=pending' },
    { label: `Bookings (${periodLabel})`, value: stats.totalBookings, icon: 'fa-solid fa-calendar-check', color: '#4CAF50', href: '/admin/bookings' },
    { label: `Orders (${periodLabel})`, value: stats.totalOrders, icon: 'fa-solid fa-receipt', color: '#3F8EFC', href: '/admin/orders' },
    { label: 'Products Live', value: stats.productsLiveCount, icon: 'fa-solid fa-gem', color: '#E59500', href: '/admin/products' },
    { label: 'Customers', value: stats.usersCount, icon: 'fa-solid fa-users', color: '#D95F5F', href: '/admin/users' },
    { label: `Orders Revenue (${periodLabel})`, value: '₹' + stats.orderRevenue.toLocaleString('en-IN'), icon: 'fa-solid fa-cart-shopping', color: '#3F8EFC', href: '/admin/orders' },
    { label: `Services Revenue (${periodLabel})`, value: '₹' + stats.bookingRevenue.toLocaleString('en-IN'), icon: 'fa-solid fa-spa', color: '#8A3FB2', href: '/admin/bookings' },
    { label: `Paid Revenue (${periodLabel})`, value: '₹' + stats.revenue.toLocaleString('en-IN'), icon: 'fa-solid fa-indian-rupee-sign', color: '#1E8449' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginTop: 0, marginBottom: 4 }}>
            Overview Dashboard
          </h1>
          <p style={{ color: 'var(--text-light,#666)', margin: 0, fontSize: '0.9rem' }}>
            Real-time analytics and management control.
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#888', background: '#fff', padding: '6px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <i className="fa-solid fa-clock me-1"></i> Live data updated
        </div>
      </div>

      {/* Period Filter */}
      <DashboardFilter />

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {cards.map((c) => {
          const inner = (
            <div
              style={{
                background: '#fff',
                padding: '1.15rem 1.25rem',
                borderRadius: 16,
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: c.href ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              className="admin-card-hover"
            >
              <div
                style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: c.color + '18', color: c.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem',
                }}
              >
                <i className={c.icon}></i>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', fontWeight: 700, marginTop: 2 }}>{c.value}</div>
              </div>
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      {/* Monthly Export */}
      <MonthlyExport />

      {/* Analytics Charts Redirection */}
      <DashboardCharts dailyMetrics={stats.dailyMetrics} categorySummary={stats.categorySummary} />

      {/* Recent Activity Rows */}
      <div className="row g-4 mt-2">
        {/* Recent Orders */}
        <div className="col-lg-6">
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Recent Store Orders
              </h4>
              <Link href="/admin/orders" style={{ fontSize: '0.82rem', color: 'var(--primary,#C8956C)', textDecoration: 'none', fontWeight: 600 }}>
                View all →
              </Link>
            </div>
            {stats.recentOrders.length === 0 ? (
              <p style={{ color: '#999', fontSize: '0.9rem', margin: '20px 0' }}>No orders yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#888', borderBottom: '1px solid #f0f0f0', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ paddingBottom: 8, fontWeight: 600 }}>Order #</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600 }}>Customer</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600, textAlign: 'right' }}>Total</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600, textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((o) => (
                      <tr key={String(o._id)} style={{ borderBottom: '1px solid #f9f9f9' }}>
                        <td style={{ padding: '10px 0', fontWeight: 600 }}>
                          <Link href={`/admin/orders/${o._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td style={{ padding: '10px 0' }}>
                          <div style={{ fontWeight: 500 }}>{o.customer.name}</div>
                          <div style={{ color: '#888', fontSize: '0.75rem' }}>{o.customer.email}</div>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>
                          {formatMoney(o.total && o.total > 0 ? o.total : o.subtotal, o.currency)}
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'center' }}>
                          <span className="crystal-tag status-tag" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="col-lg-6">
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Recent Service Bookings
              </h4>
              <Link href="/admin/bookings" style={{ fontSize: '0.82rem', color: 'var(--primary,#C8956C)', textDecoration: 'none', fontWeight: 600 }}>
                View all →
              </Link>
            </div>
            {stats.recentBookings.length === 0 ? (
              <p style={{ color: '#999', fontSize: '0.9rem', margin: '20px 0' }}>No bookings yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#888', borderBottom: '1px solid #f0f0f0', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ paddingBottom: 8, fontWeight: 600 }}>Service</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600 }}>Customer</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600 }}>Date & Slot</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600, textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentBookings.map((b) => (
                      <tr key={String(b._id)} style={{ borderBottom: '1px solid #f9f9f9' }}>
                        <td style={{ padding: '10px 0', fontWeight: 600 }}>
                          <Link href={`/admin/bookings/${b._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {b.serviceTitle}
                          </Link>
                        </td>
                        <td style={{ padding: '10px 0' }}>
                          <div style={{ fontWeight: 500 }}>{b.customer.name}</div>
                          <div style={{ color: '#888', fontSize: '0.75rem' }}>{b.customer.email}</div>
                        </td>
                        <td style={{ padding: '10px 0', fontSize: '0.8rem' }}>
                          <div>{b.date}</div>
                          <strong style={{ color: 'var(--primary,#C8956C)' }}>{b.timeSlot}</strong>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'center' }}>
                          <span className="crystal-tag status-tag" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
