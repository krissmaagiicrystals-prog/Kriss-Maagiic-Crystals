'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Initial {
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice: number | null;
  usdPrice?: number;
  originalUsdPrice?: number | null;
  image: string;
  images: string[];
  badge: 'Popular' | 'New' | 'Sale' | 'Bestseller' | null;
  desc: string;
  longDesc: string;
  chakras: string[];
  shippingCharge: number | null;
  stock: number;
  sizes: string[];
  /** Per-size stock for bracelet products e.g. { "6mm": 5, "8mm": 12 } */
  sizeStock: Record<string, number>;
  active: boolean;
}

const EMPTY: Initial = {
  slug: '', name: '', category: 'bracelets', subcategory: 'Bracelets', price: 0, originalPrice: null, usdPrice: 0, originalUsdPrice: null,
  image: '', images: [], badge: null, desc: '', longDesc: '', chakras: [], shippingCharge: null, stock: 99, sizes: [], sizeStock: {}, active: true,
};

const STANDARD_CATEGORIES = [
  { value: 'bracelets', label: 'Bracelets' },
  { value: 'rings', label: 'Rings' },
  { value: 'malas', label: 'Malas' },
  { value: 'pendants', label: 'Pendants' },
  { value: 'designer-pendants', label: 'Designer Pendants' },
  { value: 'silver-jewelry', label: 'Silver Jewelry' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'gemstones', label: 'Gemstones' },
  { value: 'anklets', label: 'Anklets' },
  { value: 'glow-essentials', label: 'Glow Essentials' },
  { value: 'crystal-towers', label: 'Crystal Towers' },
  { value: 'pyramids', label: 'Pyramids' },
  { value: 'raw-crystal', label: 'Raw Crystals' },
  { value: 'home-decor', label: 'Home Decor' },
  { value: 'spell-jars', label: 'Spell Jars' },
];

const STANDARD_SUBCATEGORIES = [
  // Bracelets
  'Bracelets',
  'Designer Bracelets',
  'Signature Bracelets',
  'Zodiac Bracelets',
  'Bangle Bracelet',
  'Chips Bracelet',
  'Evil Eye',
  // Rings
  'Designer Rings',
  'Design Rings',
  'Normal Rings',
  // Malas & Pendants
  'Malas',
  'Crystal Malas',
  'Pendants',
  'Crystal Pendants',
  'Designer Pendants',
  'Evil Eye Pendants',
  // Anklets & Other Jewelry
  'Anklets',
  'Earrings',
  'Chains',
  'Rudraksha',
  // Gemstones & Glow
  'Gemstones',
  'Face Rollers',
  'Gua Sha',
  'Combs',
  // Crystals & Towers
  'Crystal Towers',
  'Frames',
  'Pyramids',
  'Wands',
  'Raw Crystals',
  // Home Decor
  'Crystal Trees',
  'Shell Trees',
  'Angels',
  'Merkabas',
  'Spheres',
  'Lamps',
  'Bowls',
  'Keychains',
  'Zibu Coins',
  'Protection Coins',
  'Seven Chakra',
  'Wall Hangings',
  'Selenite Crystals',
  'Home Decor',
  // Spell Jars
  'Spell Jars',
];

const STANDARD_CHAKRAS = [
  'Root',
  'Sacral',
  'Solar Plexus',
  'Heart',
  'Throat',
  'Third Eye',
  'Crown'
];

const STANDARD_SIZES = ['6mm', '8mm', '10mm', '12mm'];

interface DynamicSection {
  id: string;
  title: string;
  type: 'text' | 'list' | 'affirmation' | 'disclaimer';
  content: string | string[];
}

function getDynamicSections(
  d: any,
  fallbackDesc: string,
  category?: string
): DynamicSection[] {
  if (!d) {
    return [
      {
        id: 'description',
        title: 'Description',
        type: 'text',
        content: fallbackDesc || '',
      },
    ];
  }

  // If new dynamic format with a sections array is already present
  if ('sections' in d && Array.isArray((d as any).sections)) {
    return (d as any).sections;
  }

  // Otherwise, construct from legacy fields for backwards compatibility
  const sections: DynamicSection[] = [];

  // Short description always first
  sections.push({
    id: 'description',
    title: 'Description',
    type: 'text',
    content: d.description || fallbackDesc || '',
  });

  if (d.purpose) {
    sections.push({ id: 'purpose', title: 'Purpose', type: 'text', content: d.purpose });
  }
  if (d.crystalsIncluded) {
    sections.push({ id: 'crystalsIncluded', title: 'Crystals Included', type: 'text', content: d.crystalsIncluded });
  }
  if (d.designSymbolism) {
    sections.push({ id: 'designSymbolism', title: 'Design Symbolism', type: 'text', content: d.designSymbolism });
  }
  // Note: associatedChakras removed - use the chakras array field instead which displays as "Aligned Chakras"
  
  const zodiacLine = d.zodiacSign
    ? `${d.zodiacSign}${d.birthDates ? ` · ${d.birthDates}` : ''}`
    : '';
  if (zodiacLine) {
    sections.push({ id: 'zodiac', title: 'Zodiac Sign', type: 'text', content: zodiacLine });
  }

  if (d.benefits && d.benefits.length > 0) {
    sections.push({ id: 'benefits', title: 'Benefits', type: 'list', content: d.benefits });
  }
  if (d.whoShouldWear && d.whoShouldWear.length > 0) {
    sections.push({ id: 'whoShouldWear', title: 'Who Should Wear', type: 'list', content: d.whoShouldWear });
  }

  const isAnklet = (category || '').toLowerCase().includes('anklet');
  if (isAnklet && (d.recommendedAnkle || d.recommendedHand)) {
    sections.push({
      id: 'recommendedAnkle',
      title: 'Recommended Ankle',
      type: 'text',
      content: d.recommendedAnkle || d.recommendedHand || '',
    });
  } else if (d.recommendedHand) {
    sections.push({
      id: 'recommendedHand',
      title: 'Recommended Hand to Wear',
      type: 'text',
      content: d.recommendedHand,
    });
  }

  if (d.bestFinger) {
    sections.push({ id: 'bestFinger', title: 'Best Finger', type: 'text', content: d.bestFinger });
  }
  if (d.bestDayToWear) {
    sections.push({ id: 'bestDayToWear', title: 'Best Day to Wear', type: 'text', content: d.bestDayToWear });
  }
  if (d.whenToWear) {
    sections.push({ id: 'whenToWear', title: 'When to Wear', type: 'text', content: d.whenToWear });
  }
  if (d.howToWear && d.howToWear.length > 0) {
    sections.push({ id: 'howToWear', title: 'How to Wear', type: 'list', content: d.howToWear });
  }
  if (d.placement) {
    sections.push({ id: 'placement', title: 'Placement Recommendation', type: 'text', content: d.placement });
  }
  if (d.howToUse) {
    sections.push({ id: 'howToUse', title: 'How to Use', type: 'text', content: d.howToUse });
  }
  if (d.howToEnergize) {
    sections.push({ id: 'howToEnergize', title: 'How to Energize', type: 'text', content: d.howToEnergize });
  }
  if (d.affirmation) {
    sections.push({ id: 'affirmation', title: 'Affirmation', type: 'affirmation', content: d.affirmation });
  }
  if (d.careInstructions && d.careInstructions.length > 0) {
    sections.push({ id: 'careInstructions', title: 'Care Instructions', type: 'list', content: d.careInstructions });
  }
  if (d.disclaimer) {
    sections.push({ id: 'disclaimer', title: 'Disclaimer', type: 'disclaimer', content: d.disclaimer });
  }

  return sections;
}

export default function ProductForm({ id, initial }: { id?: string; initial?: Initial }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [f, setF] = useState<Initial>(initial ? { ...EMPTY, ...initial, sizes: initial.sizes ?? [], sizeStock: initial.sizeStock ?? {} } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Drag and drop sorting states for sub-images
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverMain, setDragOverMain] = useState(false);

  // Category and Subcategory custom state
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState('');

  // Dynamic sections state
  const [sections, setSections] = useState<DynamicSection[]>([]);
  const [sizesLabel, setSizesLabel] = useState('Select Bead Size:');
  const [showSizes, setShowSizes] = useState(true);
  const [chakrasLabel, setChakrasLabel] = useState('Aligned Chakras');
  const [showChakras, setShowChakras] = useState(true);

  // Parse initial longDesc and populate dynamic sections
  useEffect(() => {
    Promise.resolve().then(() => {
      const descStr = initial?.longDesc || initial?.desc || '';
      let parsedJson: any = null;
      if (descStr && (descStr.trim().startsWith('{') || descStr.trim().startsWith('['))) {
        try {
          parsedJson = JSON.parse(descStr);
        } catch {}
      }

      // 1. Get ordered list of sections
      const list = getDynamicSections(parsedJson, initial?.desc || '', initial?.category);
      setSections(list);

      // 2. Load custom labels and settings
      if (parsedJson) {
        setSizesLabel(parsedJson.sizesLabel ?? 'Select Bead Size:');
        setShowSizes(parsedJson.showSizes !== false);
        setChakrasLabel(parsedJson.chakrasLabel ?? 'Aligned Chakras');
        setShowChakras(parsedJson.showChakras !== false);
      } else {
        // Default sections for a brand new product
        if (!initial) {
          setSections([
            { id: 'description', title: 'Description', type: 'text', content: '' },
            { id: 'purpose', title: 'Purpose', type: 'text', content: '' },
            { id: 'crystalsIncluded', title: 'Crystals Included', type: 'text', content: '' },
            { id: 'benefits', title: 'Benefits', type: 'list', content: [''] },
            { id: 'whoShouldWear', title: 'Who Should Wear', type: 'list', content: [''] },
            { id: 'howToWear', title: 'How to Wear', type: 'list', content: [''] },
            { id: 'careInstructions', title: 'Care Instructions', type: 'list', content: [''] },
            { id: 'disclaimer', title: 'Disclaimer', type: 'disclaimer', content: 'Crystals and spiritual tools are supporting instruments for emotional and energetic well-being, and should not be used as a substitute for professional medical or mental health treatments.' }
          ]);
        }
      }

      // Set custom category/subcategory check
      if (initial) {
        const catExists = STANDARD_CATEGORIES.some((c) => c.value === initial.category);
        if (!catExists && initial.category) {
          setIsCustomCategory(true);
          setCustomCategory(initial.category);
        }
        const subcatExists = STANDARD_SUBCATEGORIES.includes(initial.subcategory);
        if (!subcatExists && initial.subcategory) {
          setIsCustomSubcategory(true);
          setCustomSubcategory(initial.subcategory);
        }
      }
    });
  }, [initial]);

  const set = <K extends keyof Initial>(k: K, v: Initial[K]) => setF((s) => ({ ...s, [k]: v }));

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErr(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload via Next.js API proxy to bypass CORS
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.reason || 'Upload failed');
      }

      // Set the final public URL
      set('image', data.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'File upload error';
      setErr(msg);
    } finally {
      setUploading(false);
    }
  };

  const [galleryUploading, setGalleryUploading] = useState(false);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGalleryUploading(true);
    setErr(null);

    try {
      const newImages = [...f.images];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.reason || `Upload failed for ${file.name}`);
        }

        newImages.push(data.url);
      }
      
      set('images', newImages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gallery upload error';
      setErr(msg);
    } finally {
      setGalleryUploading(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    const newImages = [...f.images];
    newImages.splice(index, 1);
    set('images', newImages);
  };

  // Drag and Drop sort event handlers for gallery images
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...(f.images || [])];
    const draggedItem = list[draggedIndex];
    
    // Remove the dragged item and insert it at the target index
    list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, draggedItem);

    set('images', list);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Drop a gallery image onto the main image slot — swaps them
  const handleDropOnMain = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverMain(false);
    if (draggedIndex === null) return;
    const galleryImg = f.images[draggedIndex];
    if (!galleryImg) return;
    const oldMain = f.image;
    const newGallery = [...f.images];
    newGallery.splice(draggedIndex, 1);
    if (oldMain) newGallery.splice(draggedIndex, 0, oldMain); // put old main in same slot
    set('image', galleryImg);
    set('images', newGallery);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Chakra toggle helper
  const toggleChakra = (chakra: string) => {
    const current = [...f.chakras];
    const index = current.indexOf(chakra);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(chakra);
    }
    set('chakras', current);
  };

  // Size toggle helper — also prunes sizeStock when a size is deselected
  const toggleSize = (size: string) => {
    const current = [...(f.sizes || [])];
    const index = current.indexOf(size);
    if (index > -1) {
      current.splice(index, 1);
      // Remove the stock entry for the deselected size
      const newSizeStock = { ...f.sizeStock };
      delete newSizeStock[size];
      setF((s) => ({ ...s, sizes: current, sizeStock: newSizeStock }));
    } else {
      current.push(size);
      // Seed with 0 if not yet set
      const newSizeStock = { ...f.sizeStock };
      if (!(size in newSizeStock)) newSizeStock[size] = 0;
      setF((s) => ({ ...s, sizes: current, sizeStock: newSizeStock }));
    }
  };

  // Per-size stock helper
  const setSizeStock = (size: string, qty: number) => {
    setF((s) => ({ ...s, sizeStock: { ...s.sizeStock, [size]: Math.max(0, qty) } }));
  };
  // Dynamic sections helper functions
  const addSection = (type: 'text' | 'list' | 'affirmation' | 'disclaimer') => {
    const id = `custom_${Date.now()}`;
    const titles: Record<string, string> = {
      text: 'New Custom Section',
      list: 'New Bullet List Section',
      affirmation: 'Affirmation',
      disclaimer: 'Disclaimer'
    };
    setSections((prev) => [
      ...prev,
      {
        id,
        title: titles[type],
        type,
        content: type === 'list' ? [''] : '',
      },
    ]);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((sec) => sec.id !== id));
  };

  const updateSectionTitle = (id: string, title: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, title } : sec))
    );
  };

  const updateSectionContent = (id: string, content: string | string[]) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, content } : sec))
    );
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setSections(newSections);
  };

  const handleListItemChange = (sectionId: string, idx: number, val: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const arr = Array.isArray(sec.content) ? [...sec.content] : [];
        arr[idx] = val;
        return { ...sec, content: arr };
      })
    );
  };

  const addListItem = (sectionId: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const arr = Array.isArray(sec.content) ? [...sec.content] : [];
        return { ...sec, content: [...arr, ''] };
      })
    );
  };

  const removeListItem = (sectionId: string, idx: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const arr = Array.isArray(sec.content) ? [...sec.content] : [];
        arr.splice(idx, 1);
        return { ...sec, content: arr.length > 0 ? arr : [''] };
      })
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);

    // Finalize category and subcategory values
    const finalCategory = isCustomCategory ? customCategory.trim() : f.category;
    const finalSubcategory = isCustomSubcategory ? customSubcategory.trim() : f.subcategory;

    // Client-side friendly validation
    if (!f.name.trim()) {
      setErr('Product name is required.');
      setSaving(false);
      return;
    }
    if (f.name.trim().length < 2) {
      setErr('Product name must be at least 2 characters.');
      setSaving(false);
      return;
    }
    if (!f.slug.trim()) {
      setErr('URL slug is required (e.g. amethyst-bracelet).');
      setSaving(false);
      return;
    }
    if (!/^[a-z0-9-]{2,}$/.test(f.slug)) {
      setErr('URL slug must use lowercase letters, numbers, and dashes only (e.g. amethyst-bracelet).');
      setSaving(false);
      return;
    }
    if (!finalCategory) {
      setErr('Please select or enter a category.');
      setSaving(false);
      return;
    }
    if (!finalSubcategory) {
      setErr('Please select or enter a subcategory.');
      setSaving(false);
      return;
    }
    if (!f.price || f.price <= 0) {
      setErr('Price (₹) is required and must be greater than 0.');
      setSaving(false);
      return;
    }
    if (!f.image) {
      setErr('Please upload a product image before saving.');
      setSaving(false);
      return;
    }
    if (!f.desc.trim() || f.desc.trim().length < 5) {
      setErr('Short description is required (at least 5 characters).');
      setSaving(false);
      return;
    }

    // Construct serialized longDesc JSON
    const longDescJson = JSON.stringify({
      sizesLabel,
      showSizes,
      chakrasLabel,
      showChakras,
      sections: sections.map((sec) => ({
        id: sec.id,
        title: sec.title.trim(),
        type: sec.type,
        content: Array.isArray(sec.content)
          ? sec.content.map((x) => x.trim()).filter(Boolean)
          : sec.content.trim(),
      })),
    });

    const payload = {
      ...f,
      category: finalCategory,
      subcategory: finalSubcategory,
      longDesc: longDescJson,
      sizeStock: f.sizeStock,
    };

    try {
      const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        const reasonMap: Record<string, string> = {
          'slug-exists': `A product with the slug "${f.slug}" already exists. Please use a different URL slug.`,
          'bad-json': 'Something went wrong with the form data. Please refresh and try again.',
          'server-error': 'Server error — please try again in a moment.',
        };
        setErr(reasonMap[data.reason] ?? data.reason ?? 'Failed to save product. Please try again.');
        setSaving(false);
        return;
      }
      // Return to the products list preserving the active filters (category, etc.)
      const back = searchParams.toString();
      router.push(back ? `/admin/products?${back}` : '/admin/products');
      router.refresh();
    } catch {
      setErr('Network error');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ background: '#fff', padding: 24, borderRadius: 14, boxShadow: '0 4px 14px rgba(0,0,0,0.04)', maxWidth: 880, marginTop: 16 }}>
      <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary,#C8956C)' }}>
        Basic Details
      </h3>
      
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Name *</label>
          <input required value={f.name} onChange={(e) => set('name', e.target.value)} className="newsletter-input" style={{ width: '100%' }} placeholder="e.g. Amethyst Crystal Bracelet" />
        </div>
        <div className="col-md-6">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Slug (URL slug) *</label>
          <input required value={f.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} className="newsletter-input" style={{ width: '100%' }} placeholder="e.g. amethyst-bracelet" />
        </div>
        
        <div className="col-md-6">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Category *</label>
          {!isCustomCategory ? (
            <div className="d-flex gap-2">
              <select value={f.category} onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomCategory(true);
                } else {
                  set('category', e.target.value);
                }
              }} className="newsletter-input" style={{ width: '100%' }}>
                {STANDARD_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                <option value="custom">+ Add Custom Category...</option>
              </select>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <input required value={customCategory} onChange={(e) => setCustomCategory(e.target.value.toLowerCase())} className="newsletter-input" style={{ width: '100%' }} placeholder="e.g. pyramids" />
              <button type="button" className="btn-outline-custom" style={{ padding: '0 12px' }} onClick={() => {
                setIsCustomCategory(false);
                const catExists = STANDARD_CATEGORIES.some((c) => c.value === f.category);
                if (!catExists) set('category', STANDARD_CATEGORIES[0].value);
              }}>Select standard</button>
            </div>
          )}
        </div>

        <div className="col-md-6">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subcategory *</label>
          {!isCustomSubcategory ? (
            <div className="d-flex gap-2">
              <select value={f.subcategory} onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomSubcategory(true);
                } else {
                  set('subcategory', e.target.value);
                }
              }} className="newsletter-input" style={{ width: '100%' }}>
                {STANDARD_SUBCATEGORIES.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
                <option value="custom">+ Add Custom Subcategory...</option>
              </select>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <input required value={customSubcategory} onChange={(e) => setCustomSubcategory(e.target.value)} className="newsletter-input" style={{ width: '100%' }} placeholder="e.g. Crystal Trees" />
              <button type="button" className="btn-outline-custom" style={{ padding: '0 12px' }} onClick={() => {
                setIsCustomSubcategory(false);
                const subcatExists = STANDARD_SUBCATEGORIES.includes(f.subcategory);
                if (!subcatExists) set('subcategory', STANDARD_SUBCATEGORIES[0]);
              }}>Select standard</button>
            </div>
          )}
        </div>

        <div className="col-md-3">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Price (₹) *</label>
          <input required type="number" min={0} value={f.price} onChange={(e) => set('price', Number(e.target.value))} className="newsletter-input" style={{ width: '100%' }} />
        </div>
        <div className="col-md-3">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Price (USD) *</label>
          <input required type="number" min={0} value={f.usdPrice ?? ''} onChange={(e) => set('usdPrice', Number(e.target.value))} className="newsletter-input" style={{ width: '100%' }} />
        </div>
        <div className="col-md-3">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Original (₹)</label>
          <input type="number" min={0} value={f.originalPrice ?? ''} onChange={(e) => set('originalPrice', e.target.value ? Number(e.target.value) : null)} className="newsletter-input" style={{ width: '100%' }} placeholder="e.g. 1080" />
        </div>
        <div className="col-md-3">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Original (USD)</label>
          <input type="number" min={0} value={f.originalUsdPrice ?? ''} onChange={(e) => set('originalUsdPrice', e.target.value ? Number(e.target.value) : null)} className="newsletter-input" style={{ width: '100%' }} placeholder="e.g. 25" />
        </div>
        <div className="col-md-4">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Stock (Inventory)</label>
          <input type="number" min={0} value={f.stock} onChange={(e) => set('stock', Number(e.target.value))} className="newsletter-input" style={{ width: '100%' }} />
        </div>
        <div className="col-md-4">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Shipping (₹, India)</label>
          <input
            type="number"
            min={0}
            value={f.shippingCharge ?? ''}
            onChange={(e) => set('shippingCharge', e.target.value === '' ? null : Number(e.target.value))}
            className="newsletter-input"
            style={{ width: '100%' }}
            placeholder="Auto by category"
          />
          <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>Blank = automatic (₹120 / ₹150 / ₹180). Free over ₹4,500.</div>
        </div>
      </div>

      <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary,#C8956C)' }}>
        Media & Display Settings
      </h3>

      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Product Image *</label>
          <div className="d-flex gap-2 mb-2">
            <div style={{ position: 'relative' }}>
              <input type="file" id="image-upload" style={{ display: 'none' }} accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              <label htmlFor="image-upload" className="btn-outline-custom" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', height: '48px', padding: '0 24px' }}>
                <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'} me-2`}></i>
                {uploading ? 'Uploading...' : 'Upload Image'}
              </label>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>Select a high-quality local image file.</p>
        </div>
        <div className="col-md-4 d-flex justify-content-center align-items-center">
          <div
            onDragOver={(e) => { e.preventDefault(); if (draggedIndex !== null) setDragOverMain(true); }}
            onDragLeave={() => setDragOverMain(false)}
            onDrop={handleDropOnMain}
            title="Drag a gallery image here to set it as the main image"
            style={{
              position: 'relative',
              borderRadius: 12,
              padding: 4,
              background: dragOverMain ? 'rgba(200,149,108,0.12)' : '#FAF6F1',
              border: dragOverMain ? '2px dashed var(--primary,#C8956C)' : '1px solid rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
              minWidth: 100,
              minHeight: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {f.image ? (
              <>
                <img src={f.image} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain', borderRadius: 8 }} />
                <button type="button" onClick={() => set('image', '')} style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#D95F5F', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', cursor: 'pointer' }}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
                {dragOverMain && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,149,108,0.55)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: '#fff', fontSize: '0.72rem', fontWeight: 700, pointerEvents: 'none' }}>
                    <i className="fa-solid fa-arrow-down" style={{ fontSize: '1.3rem' }}></i>
                    Set as Main
                  </div>
                )}
              </>
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: dragOverMain ? 'var(--primary,#C8956C)' : '#999', fontSize: '0.75rem' }}>
                <i className={`fa-solid ${dragOverMain ? 'fa-arrow-down' : 'fa-image'}`} style={{ fontSize: '1.5rem', marginBottom: 6 }}></i>
                {dragOverMain ? 'Drop to set main' : 'No image'}
              </div>
            )}
          </div>
        </div>

        {/* Gallery Upload */}
        <div className="col-12 mt-3 mb-2">
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Additional Gallery Images</label>
          <div className="d-flex flex-wrap gap-3 mb-2">
            {f.images.map((img, i) => (
              <div
                key={i}
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                title="Drag to reorder"
                style={{
                  position: 'relative',
                  border: dragOverIndex === i ? '2px dashed var(--primary,#C8956C)' : '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 12,
                  padding: 4,
                  background: '#FAF6F1',
                  cursor: draggedIndex === i ? 'grabbing' : 'grab',
                  opacity: draggedIndex === i ? 0.4 : 1,
                  transform: dragOverIndex === i ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                  userSelect: 'none',
                }}
              >
                <img src={img} alt={`Gallery ${i}`} style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: 8, pointerEvents: 'none' }} />
                <button type="button" onClick={() => removeGalleryImage(i)} style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#D95F5F', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', cursor: 'pointer', zIndex: 10 }}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))}
            
            <div style={{ position: 'relative' }}>
              <input type="file" id="gallery-upload" style={{ display: 'none' }} accept="image/*" multiple onChange={handleGalleryUpload} disabled={galleryUploading} />
              <label htmlFor="gallery-upload" style={{ width: 80, height: 80, borderRadius: 12, border: '2px dashed rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '0.75rem', cursor: 'pointer', margin: 0, background: '#fff' }}>
                <i className={`fa-solid ${galleryUploading ? 'fa-spinner fa-spin' : 'fa-plus'}`} style={{ fontSize: '1.2rem', marginBottom: 4 }}></i>
                {galleryUploading ? 'Uploading' : 'Add'}
              </label>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>Upload multiple images to display a thumbnail gallery on the product page. <strong>Drag images to reorder them.</strong> Drag any gallery image onto the main image box above to set it as the main image.</p>
        </div>

        <div className="col-md-6">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Badge Overlay</label>
          <select value={f.badge ?? ''} onChange={(e) => set('badge', (e.target.value || null) as Initial['badge'])} className="newsletter-input" style={{ width: '100%' }}>
            <option value="">— None —</option>
            <option value="Popular">Popular</option>
            <option value="New">New</option>
            <option value="Sale">Sale</option>
            <option value="Bestseller">Bestseller</option>
          </select>
        </div>

        <div className="col-md-6">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Short Description * (Catalog Summary)</label>
          <input required value={f.desc} onChange={(e) => set('desc', e.target.value)} className="newsletter-input" style={{ width: '100%' }} placeholder="e.g. Grounding volcanic rock combined with 7 chakra balancing crystals." />
        </div>

        <div className="col-12">
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>Chakras Associated</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {STANDARD_CHAKRAS.map((ch) => {
              const active = f.chakras.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChakra(ch)}
                  className="crystal-tag"
                  style={{
                    background: active ? 'var(--primary,#C8956C)' : 'rgba(0,0,0,0.03)',
                    color: active ? '#fff' : 'inherit',
                    border: '1px solid',
                    borderColor: active ? 'var(--primary,#C8956C)' : 'rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    padding: '6px 12px',
                    borderRadius: 999,
                    transition: 'all 0.2s',
                  }}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>

        {((isCustomCategory ? customCategory.trim() : f.category)?.toLowerCase() === 'bracelets') && (
          <div className="col-12 mt-3">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>Available Bead Sizes</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {STANDARD_SIZES.map((sz) => {
                const active = f.sizes?.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className="crystal-tag"
                    style={{
                      background: active ? 'var(--primary,#C8956C)' : 'rgba(0,0,0,0.03)',
                      color: active ? '#fff' : 'inherit',
                      border: '1px solid',
                      borderColor: active ? 'var(--primary,#C8956C)' : 'rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      padding: '6px 12px',
                      borderRadius: 999,
                      transition: 'all 0.2s',
                    }}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 4 }}>Select the bead sizes you want to make available for this bracelet.</div>

            {/* Per-size stock inputs — only shown when at least one size is selected */}
            {(f.sizes ?? []).length > 0 && (
              <div style={{ marginTop: 14, background: '#FAF6F1', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(200,149,108,0.18)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B0A38F', marginBottom: 10 }}>
                  Stock per size
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {(f.sizes ?? []).map((sz) => (
                    <div key={sz} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2D1B0E', minWidth: 36 }}>{sz}</span>
                      <input
                        type="number"
                        min={0}
                        value={f.sizeStock[sz] ?? 0}
                        onChange={(e) => setSizeStock(sz, Number(e.target.value))}
                        className="newsletter-input"
                        style={{ width: 72, padding: '5px 8px', textAlign: 'right', fontSize: '0.88rem' }}
                      />
                      {(f.sizeStock[sz] ?? 0) === 0 && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc3545', background: 'rgba(220,53,69,0.08)', padding: '2px 6px', borderRadius: 4 }}>OOS</span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 8 }}>
                  Set stock for each size. 0 = out of stock for that size (customers won&#39;t be able to select it).
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary,#C8956C)' }}>
        Dynamic Product Details (Tabs / Sections)
      </h3>

      {/* Global settings for standard sections */}
      <div style={{ background: '#FAF6F1', padding: '16px 20px', borderRadius: 12, marginBottom: '24px', border: '1px solid rgba(200, 149, 108, 0.15)' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8A4F27' }}>
          Global Settings (Standard Storefront Badges/Selectors)
        </h4>
        <div className="row g-3">
          <div className="col-md-6">
            <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={showSizes} onChange={(e) => setShowSizes(e.target.checked)} style={{ width: 15, height: 15 }} />
              Show Bead Sizes Selector
            </label>
            <input 
              value={sizesLabel} 
              onChange={(e) => setSizesLabel(e.target.value)} 
              disabled={!showSizes}
              className="newsletter-input" 
              style={{ width: '100%', fontSize: '0.85rem' }} 
              placeholder="e.g. Select Bead Size:" 
            />
          </div>
          <div className="col-md-6">
            <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={showChakras} onChange={(e) => setShowChakras(e.target.checked)} style={{ width: 15, height: 15 }} />
              Show Aligned Chakras Section
            </label>
            <input 
              value={chakrasLabel} 
              onChange={(e) => setChakrasLabel(e.target.value)} 
              disabled={!showChakras}
              className="newsletter-input" 
              style={{ width: '100%', fontSize: '0.85rem' }} 
              placeholder="e.g. Aligned Chakras" 
            />
          </div>
        </div>
      </div>

      {/* Dynamic sections list */}
      <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
        {sections.map((sec, idx) => (
          <div 
            key={sec.id} 
            style={{ 
              background: '#fff', 
              border: '1.5px solid rgba(0,0,0,0.08)', 
              borderRadius: 12, 
              padding: '16px 20px',
              position: 'relative',
              boxShadow: '0 2px 8px rgba(0,0,0,0.015)'
            }}
          >
            {/* Header row of section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 300px' }}>
                <span style={{ fontSize: '0.72rem', background: '#EAEAEA', color: '#666', padding: '3px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                  {sec.type}
                </span>
                <input 
                  type="text" 
                  value={sec.title} 
                  onChange={(e) => updateSectionTitle(sec.id, e.target.value)}
                  className="newsletter-input"
                  style={{ width: '220px', padding: '4px 8px', fontSize: '0.88rem', height: 'auto', fontWeight: 700 }}
                  placeholder="Section Title"
                />
              </div>

              {/* Action buttons (Reorder, delete) */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  type="button" 
                  onClick={() => moveSection(idx, 'up')} 
                  disabled={idx === 0}
                  className="btn-outline-custom"
                  style={{ padding: '4px 8px', height: '30px', fontSize: '0.75rem', opacity: idx === 0 ? 0.3 : 1 }}
                >
                  <i className="fa-solid fa-arrow-up"></i>
                </button>
                <button 
                  type="button" 
                  onClick={() => moveSection(idx, 'down')} 
                  disabled={idx === sections.length - 1}
                  className="btn-outline-custom"
                  style={{ padding: '4px 8px', height: '30px', fontSize: '0.75rem', opacity: idx === sections.length - 1 ? 0.3 : 1 }}
                >
                  <i className="fa-solid fa-arrow-down"></i>
                </button>
                <button 
                  type="button" 
                  onClick={() => removeSection(sec.id)} 
                  className="btn-outline-custom"
                  style={{ padding: '4px 8px', height: '30px', fontSize: '0.75rem', color: '#D95F5F', borderColor: 'rgba(217,95,95,0.2)' }}
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>

            {/* Content inputs depending on type */}
            <div>
              {sec.type !== 'list' ? (
                <textarea 
                  rows={sec.type === 'text' ? 3 : 2}
                  value={sec.content as string}
                  onChange={(e) => updateSectionContent(sec.id, e.target.value)}
                  className="newsletter-input"
                  style={{ width: '100%', fontSize: '0.88rem' }}
                  placeholder={`Write the ${sec.type} content here...`}
                />
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {(sec.content as string[]).map((bullet, bIdx) => (
                    <div key={bIdx} style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text" 
                        value={bullet} 
                        onChange={(e) => handleListItemChange(sec.id, bIdx, e.target.value)}
                        className="newsletter-input"
                        style={{ width: '100%', fontSize: '0.88rem' }}
                        placeholder="Bullet list item content..."
                      />
                      <button 
                        type="button" 
                        onClick={() => removeListItem(sec.id, bIdx)} 
                        className="btn-outline-custom"
                        style={{ padding: '0 10px', color: '#D95F5F', borderColor: 'rgba(217,95,95,0.2)', height: '42px' }}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => addListItem(sec.id)} 
                    className="btn-outline-custom"
                    style={{ width: 'fit-content', fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <i className="fa-solid fa-plus me-1"></i> Add Bullet Item
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Section Buttons Row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: '#F8F9FA', padding: 14, borderRadius: 12, border: '1px dashed rgba(0,0,0,0.12)', marginBottom: '24px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666', display: 'flex', alignItems: 'center', marginRight: 6 }}>
          <i className="fa-solid fa-folder-plus me-1"></i> Add Custom Tab:
        </span>
        <button type="button" onClick={() => addSection('text')} className="btn-outline-custom" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          + Add Paragraph Section
        </button>
        <button type="button" onClick={() => addSection('list')} className="btn-outline-custom" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          + Add Bullet List Section
        </button>
        <button type="button" onClick={() => addSection('affirmation')} className="btn-outline-custom" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          + Add Affirmation Box
        </button>
        <button type="button" onClick={() => addSection('disclaimer')} className="btn-outline-custom" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          + Add Disclaimer Text
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <label style={{ fontSize: '0.9rem', display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} style={{ width: 16, height: 16 }} />
            <span>Visible on the storefront (active status)</span>
          </label>
        </div>
      </div>

      {err && (
        <div
          style={{
            background: 'rgba(217,95,95,0.08)',
            border: '1px solid rgba(217,95,95,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginTop: 12,
            color: '#C0392B',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
          ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
        >
          <i className="fa-solid fa-circle-exclamation" style={{ marginTop: 2, flexShrink: 0 }}></i>
          <span>{err}</span>
        </div>
      )}

      <div className="d-flex gap-3 mt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1.25rem' }}>
        <button type="submit" disabled={saving || uploading} className="btn-primary-custom" style={{ justifyContent: 'center', minWidth: 150 }}>
          <i className="fa-solid fa-save me-2"></i>
          <span>{saving ? 'Saving…' : (id ? 'Save changes' : 'Create product')}</span>
        </button>
        <button type="button" onClick={() => router.back()} className="btn-outline-custom" style={{ minWidth: 120 }}>
          <i className="fa-solid fa-arrow-left me-2"></i>
          <span>Cancel</span>
        </button>
      </div>
    </form>
  );
}
