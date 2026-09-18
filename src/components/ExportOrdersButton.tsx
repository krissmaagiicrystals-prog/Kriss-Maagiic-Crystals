'use client';

import * as XLSX from 'xlsx';

import { getInrEquivalent } from '@/lib/money';

export default function ExportOrdersButton({ orders }: { orders: unknown[] }) {
  const handleExport = () => {
    // 1. Format the data for Excel
    const data = orders.map((o: any) => {
      // Flatten the order items
      const itemsStr = o.items ? o.items.map((i: Record<string, unknown>) => `${i.quantity}x ${i.name}`).join(', ') : '';
      const inrEquivalent = getInrEquivalent(o.total, o.currency, o.inrAmount);
      
      return {
        'Order Number': o.orderNumber,
        'Date': new Date(o.createdAt).toLocaleDateString(),
        'Time': new Date(o.createdAt).toLocaleTimeString(),
        'Status': o.status,
        'Customer Name': o.customer?.name || '',
        'Customer Email': o.customer?.email || '',
        'Customer Phone': o.customer?.phone || '',
        'Items': itemsStr,
        'Currency': o.currency || 'INR',
        'Subtotal': o.subtotal,
        'Shipping': o.shippingCost,
        'Total (Original)': o.total,
        'Total (₹ INR Equivalent)': inrEquivalent,
        'Address Line 1': o.shippingAddress?.line1 || '',
        'Address Line 2': o.shippingAddress?.line2 || '',
        'City': o.shippingAddress?.city || '',
        'State': o.shippingAddress?.state || '',
        'Postal Code': o.shippingAddress?.postalCode || '',
        'Country': o.shippingAddress?.country || '',
        'Payment ID': o.razorpayPaymentId || '',
      };
    });

    // 2. Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // 3. Trigger download
    const filename = `KrissMagicc_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  return (
    <button onClick={handleExport} className="btn-outline-custom" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: '42px', padding: '0 16px' }}>
      <i className="fa-solid fa-file-excel" style={{ color: '#2ecc71' }}></i>
      Export to Excel
    </button>
  );
}
