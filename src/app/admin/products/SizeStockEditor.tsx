'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

const PANEL_WIDTH = 240;

interface Props {
  id: string;
  sizes: string[];
  /** sizeStock comes from MongoDB as a plain object after .lean() */
  sizeStock: Record<string, number>;
}

export default function SizeStockEditor({ id, sizes, sizeStock: initialSizeStock }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const sz of sizes) out[sz] = initialSizeStock[sz] ?? 0;
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep local state in sync if parent re-renders with fresh data
  useEffect(() => {
    const fresh: Record<string, number> = {};
    for (const sz of sizes) fresh[sz] = initialSizeStock[sz] ?? 0;
    setVals(fresh);
  }, [sizes, initialSizeStock]);

  const dirty = sizes.some((sz) => vals[sz] !== (initialSizeStock[sz] ?? 0));

  const openPanel = () => {
    // Reset to latest saved values each time the panel opens
    const reset: Record<string, number> = {};
    for (const sz of sizes) reset[sz] = initialSizeStock[sz] ?? 0;
    setVals(reset);
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

  const setSize = (sz: string, v: number) =>
    setVals((cur) => ({ ...cur, [sz]: Math.max(0, v) }));

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sizeStock: vals }),
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
      alert('Network error saving size stock');
    } finally {
      setSaving(false);
    }
  };

  if (sizes.length === 0) {
    return <span style={{ color: '#ccc', fontSize: '0.8rem' }}>—</span>;
  }

  // Summary label: e.g. "6mm:5  8mm:0  10mm:12"
  const summary = sizes.map((sz) => {
    const qty = initialSizeStock[sz] ?? 0;
    return (
      <span
        key={sz}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: '1px 6px',
          borderRadius: 4,
          fontSize: '0.7rem',
          fontWeight: 700,
          background: qty === 0 ? 'rgba(220,53,69,0.1)' : 'rgba(200,149,108,0.1)',
          color: qty === 0 ? '#dc3545' : '#8A5A2B',
          border: `1px solid ${qty === 0 ? 'rgba(220,53,69,0.25)' : 'rgba(200,149,108,0.25)'}`,
        }}
      >
        {sz}: {qty}
      </span>
    );
  });

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }} data-no-row-nav>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); open ? close() : openPanel(); }}
        title="Edit per-size stock"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
          padding: '4px 8px', borderRadius: 7, cursor: 'pointer',
          border: '1px solid rgba(200,149,108,0.3)',
          background: 'rgba(200,149,108,0.04)',
          lineHeight: 1.4,
        }}
      >
        {summary}
        <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem', opacity: 0.5, flexShrink: 0 }}></i>
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
            Stock per size
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {sizes.map((sz) => (
              <div key={sz} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 36, fontSize: '0.82rem', fontWeight: 700, color: '#2D1B0E', flexShrink: 0 }}>{sz}</span>
                <input
                  type="number"
                  min={0}
                  value={vals[sz] ?? 0}
                  onChange={(e) => setSize(sz, Number(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
                  style={{
                    flex: 1, padding: '5px 8px', borderRadius: 6, textAlign: 'right',
                    border: `1px solid ${(vals[sz] ?? 0) !== (initialSizeStock[sz] ?? 0) ? '#C8956C' : 'rgba(0,0,0,0.15)'}`,
                    fontSize: '0.85rem',
                  }}
                />
                {(vals[sz] ?? 0) === 0 && (
                  <span title="Out of stock" style={{ color: '#dc3545', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>OOS</span>
                )}
              </div>
            ))}
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
