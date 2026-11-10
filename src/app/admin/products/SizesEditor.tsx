'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

const STANDARD_SIZES = ['6mm', '8mm', '10mm', '12mm'];
const PANEL_WIDTH = 280;

export default function SizesEditor({
  id,
  sizes,
  sizeStock: initialSizeStock = {},
}: {
  id: string;
  sizes: string[];
  sizeStock?: Record<string, number>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(sizes);
  const [extra, setExtra] = useState<string[]>(sizes.filter((s) => !STANDARD_SIZES.includes(s)));
  const [stock, setStock] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const sz of sizes) out[sz] = initialSizeStock[sz] ?? 0;
    return out;
  });
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const options = [...STANDARD_SIZES, ...extra];

  const sizesDirty = selected.length !== sizes.length || selected.some((s) => !sizes.includes(s));
  const stockDirty = selected.some((sz) => (stock[sz] ?? 0) !== (initialSizeStock[sz] ?? 0));
  const dirty = sizesDirty || stockDirty;

  const openPanel = () => {
    setSelected(sizes);
    setExtra(sizes.filter((s) => !STANDARD_SIZES.includes(s)));
    const fresh: Record<string, number> = {};
    for (const sz of sizes) fresh[sz] = initialSizeStock[sz] ?? 0;
    setStock(fresh);
    setCustom('');
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      const left = Math.max(8, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8));
      setPos({ top: r.bottom + 4, left });
    }
    setOpen(true);
  };

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  const toggle = (sz: string) => {
    setSelected((cur) => {
      if (cur.includes(sz)) return cur.filter((x) => x !== sz);
      // seed stock to 0 if not yet set
      setStock((s) => (sz in s ? s : { ...s, [sz]: 0 }));
      return [...cur, sz];
    });
  };

  const setStockVal = (sz: string, v: number) =>
    setStock((cur) => ({ ...cur, [sz]: Math.max(0, v) }));

  const addCustom = () => {
    const val = custom.trim();
    if (!val) return;
    if (!options.includes(val)) setExtra((cur) => [...cur, val]);
    setSelected((cur) => (cur.includes(val) ? cur : [...cur, val]));
    setStock((s) => (val in s ? s : { ...s, [val]: 0 }));
    setCustom('');
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    // Build sizeStock only for selected sizes
    const sizeStock: Record<string, number> = {};
    for (const sz of selected) sizeStock[sz] = stock[sz] ?? 0;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sizes: selected, sizeStock }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
        setOpen(false);
        router.refresh();
      } else {
        alert('Failed to save: ' + (data.reason || 'unknown'));
      }
    } catch {
      alert('Network error saving sizes');
    } finally {
      setSaving(false);
    }
  };

  const hasSizes = sizes.length > 0;

  // Trigger label: show sizes with stock counts
  const triggerLabel = hasSizes
    ? sizes.map((sz) => {
        const qty = initialSizeStock[sz] ?? 0;
        return (
          <span
            key={sz}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700,
              background: qty === 0 ? 'rgba(220,53,69,0.1)' : 'rgba(200,149,108,0.1)',
              color: qty === 0 ? '#dc3545' : '#8A5A2B',
              border: `1px solid ${qty === 0 ? 'rgba(220,53,69,0.25)' : 'rgba(200,149,108,0.25)'}`,
            }}
          >
            {sz}: {qty}
          </span>
        );
      })
    : 'Set sizes';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); open ? close() : openPanel(); }}
        title="Edit bracelet sizes & stock"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
          padding: hasSizes ? '4px 8px' : '5px 10px', borderRadius: 8,
          border: `1px solid ${hasSizes ? 'rgba(200,149,108,0.3)' : 'rgba(0,0,0,0.15)'}`,
          background: hasSizes ? 'rgba(200,149,108,0.04)' : '#fff',
          color: hasSizes ? '#8A5A2B' : '#999',
          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
        }}
      >
        {triggerLabel}
        <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.6rem', opacity: 0.7, flexShrink: 0 }}></i>
      </button>
      {saved && !open && (
        <span style={{ color: '#1E8449', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>
      )}

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: PANEL_WIDTH, zIndex: 3000,
            background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10,
            boxShadow: '0 8px 28px rgba(0,0,0,0.14)', padding: 14, textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B0A38F', marginBottom: 10 }}>
            Sizes &amp; Stock
          </div>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ flex: 1, fontSize: '0.65rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Size</span>
            <span style={{ width: 72, fontSize: '0.65rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Stock</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {options.map((sz) => {
              const on = selected.includes(sz);
              const qty = stock[sz] ?? 0;
              return (
                <div
                  key={sz}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 6px', borderRadius: 6,
                    background: on ? 'rgba(200,149,108,0.08)' : 'transparent',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(sz)}
                      style={{ accentColor: '#C8956C', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: on ? 700 : 500, color: on ? '#8A5A2B' : '#2D1B0E' }}>{sz}</span>
                  </label>
                  {on && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => setStockVal(sz, Number(e.target.value))}
                        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
                        style={{
                          width: 60, padding: '4px 6px', borderRadius: 6, textAlign: 'right',
                          border: `1px solid ${qty !== (initialSizeStock[sz] ?? 0) ? '#C8956C' : 'rgba(0,0,0,0.15)'}`,
                          fontSize: '0.82rem',
                        }}
                      />
                      {qty === 0 && (
                        <span title="Out of stock" style={{ color: '#dc3545', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>OOS</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add custom size */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              placeholder="Custom size e.g. 14mm"
              style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.78rem' }}
            />
            <button
              type="button"
              onClick={addCustom}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: '#FAF6F1', color: '#8A5A2B', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Add
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              style={{
                flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none',
                background: dirty ? '#C8956C' : 'rgba(0,0,0,0.12)',
                color: dirty ? '#fff' : '#999',
                fontSize: '0.8rem', fontWeight: 700,
                cursor: saving ? 'wait' : dirty ? 'pointer' : 'default',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={close}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#777', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
