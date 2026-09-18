import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireAdmin } from '@/lib/adminGuard';
import { connectMongoose } from '@/lib/mongoose';
import { Order } from '@/models/Order';
import { Booking } from '@/models/Booking';
import { User } from '@/models/User';
import { Product } from '@/models/Product';

import { getInrEquivalent } from '@/lib/money';

const C = {
  darkBrown: '1C0A02', midBrown: '2D1B0E', gold: 'C8956C',
  goldLight: 'E8C99A', goldDeep: 'A0622A', cream: 'F5EDD8',
  creamLight: 'FAF6F1', white: 'FFFFFF',
  green: '2E7D32', greenBg: 'E8F5E9',
  orange: 'E65100', orangeBg: 'FFF3E0',
  red: 'C62828', redBg: 'FFEBEE',
  purple: '6A1B9A', purpleBg: 'F3E5F5',
};

type CellValue = string | number | null;

function hdr(cell: ExcelJS.Cell, bg = C.darkBrown, fg = C.white) {
  cell.font = { bold: true, color: { argb: 'FF' + fg }, size: 11, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = { top: { style: 'medium', color: { argb: 'FF' + C.gold } }, left: { style: 'medium', color: { argb: 'FF' + C.gold } }, bottom: { style: 'medium', color: { argb: 'FF' + C.gold } }, right: { style: 'medium', color: { argb: 'FF' + C.gold } } };
}
function dat(cell: ExcelJS.Cell, even: boolean, align: ExcelJS.Alignment['horizontal'] = 'left') {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (even ? C.creamLight : C.white) } };
  cell.font = { size: 10, name: 'Calibri', color: { argb: 'FF' + C.midBrown } };
  cell.alignment = { horizontal: align, vertical: 'middle' };
  cell.border = { top: { style: 'thin', color: { argb: 'FFE0D0C0' } }, left: { style: 'thin', color: { argb: 'FFE0D0C0' } }, bottom: { style: 'thin', color: { argb: 'FFE0D0C0' } }, right: { style: 'thin', color: { argb: 'FFE0D0C0' } } };
}
function statusStyle(s: string) {
  const v = (s || '').toLowerCase();
  if (['paid', 'completed', 'approved', 'delivered'].includes(v)) return { bg: C.greenBg, fg: C.green };
  if (['pending'].includes(v)) return { bg: C.orangeBg, fg: C.orange };
  if (['failed', 'cancelled', 'rejected'].includes(v)) return { bg: C.redBg, fg: C.red };
  return { bg: C.purpleBg, fg: C.purple };
}
function titleRow(ws: ExcelJS.Worksheet, cols: number, text: string) {
  ws.mergeCells(`A1:${String.fromCharCode(64 + cols)}1`);
  const c = ws.getCell('A1');
  c.value = text;
  c.font = { bold: true, size: 14, color: { argb: 'FF' + C.goldLight }, name: 'Calibri' };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.darkBrown } };
  c.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 34;
}

export async function GET() {
  const g = await requireAdmin();
  if (!g.ok) return g.res;

  await connectMongoose();
  const [orders, bookings, users, products] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).lean(),
    Booking.find().sort({ createdAt: -1 }).lean(),
    User.find().sort({ createdAt: -1 }).lean(),
    Product.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean(),
  ]);

  const paidOrders   = orders.filter((o) => o.paymentStatus === 'paid');
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
  const orderRevenue   = paidOrders.reduce((s, o) => s + getInrEquivalent(o.total || o.subtotal || 0, o.currency, o.inrAmount), 0);
  const bookingRevenue = paidBookings.reduce((s, b) => s + getInrEquivalent(b.servicePrice || 0, b.currency, b.inrAmount), 0);
  const totalRevenue   = orderRevenue + bookingRevenue;
  const generatedOn    = new Date().toLocaleString('en-IN');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'KrissMaagiic Crystals';
  wb.created = new Date();

  /* ── SHEET 1: SUMMARY ── */
  const ws1 = wb.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF' + C.gold } } });
  ws1.columns = [{ width: 36 }, { width: 20 }, { width: 24 }];
  titleRow(ws1, 3, '✦  KrissMaagiic Crystals — Full Business Report  ✦');

  ws1.mergeCells('A2:C2');
  const sub = ws1.getCell('A2');
  sub.value = `All-time data  ·  Generated ${generatedOn}`;
  sub.font = { size: 11, color: { argb: 'FF' + C.midBrown }, italic: true, name: 'Calibri' };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.cream } };
  sub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(2).height = 22;
  ws1.getRow(3).height = 8;

  ['Metric', 'Count', 'Revenue (₹ INR)'].forEach((h, i) => { const c = ws1.getRow(4).getCell(i + 1); c.value = h; hdr(c, C.gold, C.darkBrown); });
  ws1.getRow(4).height = 26;

  const summaryRows: [string, CellValue, CellValue][] = [
    ['Total Orders',         orders.length,           null],
    ['Paid Orders',          paidOrders.length,        orderRevenue],
    ['Total Bookings',       bookings.length,          null],
    ['Paid Bookings',        paidBookings.length,      bookingRevenue],
    ['Total Customers',      users.length,             null],
    ['Live Products',        products.filter(p => p.active).length, null],
  ];
  summaryRows.forEach((row, ri) => {
    const r = ws1.getRow(5 + ri); r.height = 22;
    row.forEach((v, ci) => { const c = r.getCell(ci + 1); c.value = v; dat(c, ri % 2 === 0, ci === 0 ? 'left' : 'center'); if (ci === 2 && v) c.numFmt = '₹#,##0.00'; });
  });

  const tr = ws1.getRow(11); tr.height = 28;
  (['✦  Total Paid Revenue (INR)', null, totalRevenue] as CellValue[]).forEach((v, ci) => {
    const c = tr.getCell(ci + 1); c.value = v;
    c.font = { bold: true, size: 13, color: { argb: 'FF' + C.white }, name: 'Calibri' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.goldDeep } };
    c.alignment = { horizontal: ci === 0 ? 'left' : 'center', vertical: 'middle' };
    if (ci === 2) c.numFmt = '₹#,##0.00';
  });

  /* ── SHEET 2: ALL ORDERS ── */
  const ws2 = wb.addWorksheet('Orders', { properties: { tabColor: { argb: 'FF4CAF50' } } });
  ws2.columns = [
    { width: 16 }, { width: 13 }, { width: 22 }, { width: 28 }, 
    { width: 14 }, { width: 28 }, { width: 7  }, { width: 10 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 14 }, 
    { width: 16 }, { width: 14 }, { width: 15 }
  ];
  titleRow(ws2, 15, `KrissMaagiic — All Orders  ·  ${orders.length} total`);
  const oHdrs = ['Order #', 'Date', 'Customer', 'Email', 'Phone', 'Product', 'Qty', 'Currency', 'Unit Price', 'Line Total', 'Shipping', 'Order Total', 'Total (₹ INR)', 'Status', 'Payment'];
  oHdrs.forEach((h, i) => { const c = ws2.getRow(2).getCell(i + 1); c.value = h; hdr(c, C.midBrown, C.goldLight); });
  ws2.getRow(2).height = 24;
  ws2.views = [{ state: 'frozen', ySplit: 2 }];

  let ri2 = 3;
  let totalLineAmt = 0;
  let totalShippingAmt = 0;
  let totalOrderRevenueInr = 0;

  for (const o of orders) {
    const date = new Date(o.createdAt).toLocaleDateString('en-IN');
    const isPaid = o.paymentStatus === 'paid';
    const orderInrTotal = getInrEquivalent(o.total || o.subtotal || 0, o.currency, o.inrAmount);
    if (isPaid) {
      totalOrderRevenueInr += orderInrTotal;
      totalShippingAmt += (o.shipping ?? 0);
    }

    let itemIdx = 0;
    for (const item of (o.items || [])) {
      const even = ri2 % 2 === 0;
      const r = ws2.getRow(ri2); r.height = 20;

      if (isPaid) {
        totalLineAmt += (item.lineTotal || 0);
      }

      const shippingVal = itemIdx === 0 ? (o.shipping ?? 0) : 0;
      const orderTotalVal = itemIdx === 0 ? (o.total || o.subtotal || 0) : 0;
      const orderInrVal = itemIdx === 0 ? orderInrTotal : 0;

      const vals: CellValue[] = [
        o.orderNumber, date,
        o.customer?.name || '', o.customer?.email || '', o.customer?.phone || '',
        item.name, item.qty, o.currency || 'INR',
        item.price, item.lineTotal,
        shippingVal, orderTotalVal, orderInrVal,
        o.status, o.paymentStatus
      ];
      vals.forEach((v, ci) => {
        const c = r.getCell(ci + 1); c.value = v; dat(c, even, ci >= 6 && ci <= 12 ? 'center' : 'left');
        if (ci === 13 || ci === 14) { 
          const sc = statusStyle(String(v)); 
          c.font = { bold: true, size: 10, color: { argb: 'FF' + sc.fg }, name: 'Calibri' }; 
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + sc.bg } }; 
        }
        if (ci === 12) c.numFmt = '₹#,##0.00';
      });
      ri2++;
      itemIdx++;
    }
  }

  // Orders total row
  if (ri2 > 3) {
    const totRow2 = ws2.getRow(ri2);
    totRow2.height = 22;
    const tv: CellValue[] = ['TOTAL', '', '', '', '', `${orders.length} order(s)`, '', '', totalLineAmt, totalShippingAmt, '', totalOrderRevenueInr, '', ''];
    tv.forEach((v, ci) => {
      const cell = totRow2.getCell(ci + 1);
      cell.value = v === '' ? null : v;
      cell.font  = { bold: true, size: 10, color: { argb: 'FF' + C.white }, name: 'Calibri' };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.gold } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (ci === 11) cell.numFmt = '₹#,##0.00';
    });
    ri2++;
  }

  /* ── SHEET 3: ALL BOOKINGS ── */
  const ws3 = wb.addWorksheet('Bookings', { properties: { tabColor: { argb: 'FFC8956C' } } });
  ws3.columns = [
    { width: 16 }, { width: 13 }, { width: 22 }, { width: 28 },
    { width: 14 }, { width: 28 }, { width: 14 }, { width: 13 },
    { width: 10 }, { width: 14 }, { width: 16 }, { width: 13 }, { width: 14 }
  ];
  titleRow(ws3, 13, `KrissMaagiic — All Bookings  ·  ${bookings.length} total`);
  const bHdrs = ['Booking #', 'Date', 'Customer', 'Email', 'Phone', 'Service', 'Booked Date', 'Time Slot', 'Currency', 'Original Price', 'Price (₹ INR)', 'Status', 'Payment'];
  bHdrs.forEach((h, i) => { const c = ws3.getRow(2).getCell(i + 1); c.value = h; hdr(c, C.goldDeep, C.white); });
  ws3.getRow(2).height = 24;
  ws3.views = [{ state: 'frozen', ySplit: 2 }];

  let ri3 = 3;
  for (const b of bookings) {
    const even = ri3 % 2 === 0;
    const r = ws3.getRow(ri3); r.height = 20;
    const inrPrice = getInrEquivalent(b.servicePrice || 0, b.currency, b.inrAmount);
    const vals: CellValue[] = [
      b.bookingNumber,
      new Date(b.createdAt).toLocaleDateString('en-IN'),
      b.customer?.name || '', b.customer?.email || '', b.customer?.phone || '',
      b.serviceTitle, b.date, b.timeSlot,
      b.currency || 'INR',
      b.servicePrice || 0,
      inrPrice,
      b.status, b.paymentStatus
    ];
    vals.forEach((v, ci) => {
      const c = r.getCell(ci + 1); c.value = v; dat(c, even, ci >= 6 ? 'center' : 'left');
      if (ci === 11 || ci === 12) { const sc = statusStyle(String(v)); c.font = { bold: true, size: 10, color: { argb: 'FF' + sc.fg }, name: 'Calibri' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + sc.bg } }; }
      if (ci === 10) c.numFmt = '₹#,##0.00';
    });
    ri3++;
  }

  // Bookings total row
  if (ri3 > 3) {
    const totRow3 = ws3.getRow(ri3);
    totRow3.height = 22;
    const tv: CellValue[] = ['TOTAL', '', '', '', '', `${bookings.length} booking(s)`, '', '', '', '', bookingRevenue, '', ''];
    tv.forEach((v, ci) => {
      const cell = totRow3.getCell(ci + 1);
      cell.value = v === '' ? null : v;
      cell.font  = { bold: true, size: 10, color: { argb: 'FF' + C.white }, name: 'Calibri' };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.gold } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (ci === 10) cell.numFmt = '₹#,##0.00';
    });
    ri3++;
  }

  /* ── SHEET 4: ALL CUSTOMERS ── */
  const ws4 = wb.addWorksheet('Customers', { properties: { tabColor: { argb: 'FF3F8EFC' } } });
  ws4.columns = [{ width: 26 }, { width: 32 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 16 }];
  titleRow(ws4, 6, `KrissMaagiic — Customers  ·  ${users.length} registered`);
  ['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'].forEach((h, i) => { const c = ws4.getRow(2).getCell(i + 1); c.value = h; hdr(c, '3F5878', C.white); });
  ws4.getRow(2).height = 24;
  ws4.views = [{ state: 'frozen', ySplit: 2 }];

  users.forEach((u, ri) => {
    const even = ri % 2 === 0;
    const r = ws4.getRow(3 + ri); r.height = 20;
    const vals: CellValue[] = [u.name, u.email, u.phone || '—', u.role, u.active ? 'Active' : 'Disabled', new Date(u.createdAt).toLocaleDateString('en-IN')];
    vals.forEach((v, ci) => {
      const c = r.getCell(ci + 1); c.value = v; dat(c, even, ci >= 3 ? 'center' : 'left');
      if (ci === 4) { const sc = v === 'Active' ? { bg: C.greenBg, fg: C.green } : { bg: C.redBg, fg: C.red }; c.font = { bold: true, size: 10, color: { argb: 'FF' + sc.fg }, name: 'Calibri' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + sc.bg } }; }
    });
  });

  /* ── SHEET 5: PRODUCTS ── */
  const ws5 = wb.addWorksheet('Products', { properties: { tabColor: { argb: 'FFE59500' } } });
  ws5.columns = [{ width: 28 }, { width: 16 }, { width: 22 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 12 }];
  titleRow(ws5, 8, `KrissMaagiic — Products  ·  ${products.length} total`);
  ['Name', 'Category', 'Subcategory', 'Price ₹', 'USD $', 'Stock', 'Badge', 'Status'].forEach((h, i) => { const c = ws5.getRow(2).getCell(i + 1); c.value = h; hdr(c, C.goldDeep, C.white); });
  ws5.getRow(2).height = 24;
  ws5.views = [{ state: 'frozen', ySplit: 2 }];

  products.forEach((p, ri) => {
    const even = ri % 2 === 0;
    const r = ws5.getRow(3 + ri); r.height = 20;
    const vals: CellValue[] = [p.name, p.category, p.subcategory, p.price, p.usdPrice || 0, p.stock, p.badge || '—', p.active ? 'Live' : 'Hidden'];
    vals.forEach((v, ci) => {
      const c = r.getCell(ci + 1); c.value = v; dat(c, even, ci >= 3 ? 'center' : 'left');
      if (ci === 3) c.numFmt = '₹#,##0.00';
      if (ci === 4) c.numFmt = '$#,##0.00';
      if (ci === 7) { const sc = v === 'Live' ? { bg: C.greenBg, fg: C.green } : { bg: C.orangeBg, fg: C.orange }; c.font = { bold: true, size: 10, color: { argb: 'FF' + sc.fg }, name: 'Calibri' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + sc.bg } }; }
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const filename = `krissmaagiic-full-report-${new Date().toISOString().split('T')[0]}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
