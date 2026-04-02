import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  createAdminQrCode,
  listAdminQrCodes,
  updateAdminQrCode,
  type AdminQrCodeItem,
  type AdminQrTemplate,
  type AdminQrStylePreset,
} from '../../api/admin.api';

type FormState = {
  code: string;
  redirectUrl: string;
  templateId: string;
  stylePreset: AdminQrStylePreset['id'];
  foregroundColor: string;
  backgroundColor: string;
  logoUrl: string;
};

const QR_STYLE_PRESET_OPTIONS: Array<AdminQrStylePreset & {
  visual: {
    dotsType: 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square';
    cornersSquareType: 'square' | 'dot' | 'extra-rounded';
    cornersDotType: 'square' | 'dot';
  };
}> = [
  { id: 'rounded', name: 'Rounded', description: 'Smooth modules and gentle corners', visual: { dotsType: 'rounded', cornersSquareType: 'extra-rounded', cornersDotType: 'dot' } },
  { id: 'dots', name: 'Dots', description: 'Soft dotted look with a premium feel', visual: { dotsType: 'dots', cornersSquareType: 'extra-rounded', cornersDotType: 'dot' } },
  { id: 'classy', name: 'Classy', description: 'Balanced geometry for corporate use', visual: { dotsType: 'classy', cornersSquareType: 'square', cornersDotType: 'dot' } },
  { id: 'square', name: 'Square', description: 'Clean and compact standard QR', visual: { dotsType: 'square', cornersSquareType: 'square', cornersDotType: 'square' } },
];

const DEFAULT_FOREGROUND = '#0F172A';
const DEFAULT_BACKGROUND = '#FFFFFF';

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Unable to read logo file'));
  reader.readAsDataURL(file);
});

const buildQrDestination = (code: string): string => {
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://www.manas360.com';
  const origin = /localhost|127\.0\.0\.1|capacitor:/i.test(rawOrigin)
    ? 'https://www.manas360.com'
    : rawOrigin;

  return `${origin}/api/v1/qr/${encodeURIComponent(code)}`;
};

const getStyleOption = (stylePreset: AdminQrStylePreset['id']) => {
	return QR_STYLE_PRESET_OPTIONS.find((preset) => preset.id === stylePreset) || QR_STYLE_PRESET_OPTIONS[0];
};

const downloadQrSvg = (code: string): void => {
  const svg = document.getElementById(`qr-svg-${code}`) as SVGElement | null;
  if (!svg) {
    toast.error('QR preview not ready yet.');
    return;
  }

  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${code}.svg`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function QrCodeManager() {
  const [items, setItems] = useState<AdminQrCodeItem[]>([]);
  const [templates, setTemplates] = useState<AdminQrTemplate[]>([]);
  const [stylePresets, setStylePresets] = useState<AdminQrStylePreset[]>(QR_STYLE_PRESET_OPTIONS.map(({ visual: _visual, ...preset }) => preset));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    code: '',
    redirectUrl: '',
    templateId: 'classic-black',
    stylePreset: 'rounded',
    foregroundColor: DEFAULT_FOREGROUND,
    backgroundColor: DEFAULT_BACKGROUND,
    logoUrl: '',
  });

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewQrRef = useRef<QRCodeStyling | null>(null);

  const totalScans = items.reduce((sum, item) => sum + Number(item.scanCount || 0), 0);
  const totalConnections = items.reduce((sum, item) => sum + Number(item.connectedCount || 0), 0);
  const activeItems = items.filter((item) => item.isActive).length;
  const scanToConnectRate = totalScans > 0 ? Math.round((totalConnections / totalScans) * 100) : 0;

  const refresh = async () => {
    try {
      const response = await listAdminQrCodes();
      setItems(response.data.items || []);
      setTemplates(response.data.templates || []);
      setStylePresets(response.data.stylePresets?.length ? response.data.stylePresets : QR_STYLE_PRESET_OPTIONS.map(({ visual: _visual, ...preset }) => preset));
      if ((response.data.templates || []).length > 0 && !form.templateId) {
        setForm((prev) => ({ ...prev, templateId: response.data.templates[0].id }));
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const resetForm = () => {
    setEditingCode(null);
    setForm({
      code: '',
      redirectUrl: '',
      templateId: templates[0]?.id || 'classic-black',
      stylePreset: stylePresets[0]?.id || 'rounded',
      foregroundColor: DEFAULT_FOREGROUND,
      backgroundColor: DEFAULT_BACKGROUND,
      logoUrl: '',
    });
  };

  const startEdit = (item: AdminQrCodeItem) => {
    setEditingCode(item.code);
    setForm({
      code: item.code,
      redirectUrl: item.redirectUrl,
      templateId: item.templateId,
      stylePreset: item.stylePreset,
      foregroundColor: item.foregroundColor,
      backgroundColor: item.backgroundColor,
      logoUrl: item.logoUrl || '',
    });
  };

  const onLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file for the logo.');
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((prev) => ({ ...prev, logoUrl: dataUrl }));
      toast.success('Logo added to QR preview');
    } catch (error) {
      console.error(error);
      toast.error('Failed to load logo image');
    } finally {
      event.target.value = '';
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      code: form.code.trim() || undefined,
      redirectUrl: form.redirectUrl.trim(),
      templateId: form.templateId,
      stylePreset: form.stylePreset,
      foregroundColor: form.foregroundColor,
      backgroundColor: form.backgroundColor,
      logoUrl: form.logoUrl.trim() || null,
    };

    try {
      if (editingCode) {
        await updateAdminQrCode(editingCode, payload);
        toast.success('QR code updated');
      } else {
        await createAdminQrCode(payload);
        toast.success('QR code created');
      }

      resetForm();
      await refresh();
    } catch (error: any) {
      const message = String(error?.response?.data?.message || 'Unable to save QR code');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: AdminQrCodeItem) => {
    try {
      await updateAdminQrCode(item.code, { isActive: !item.isActive });
      await refresh();
      toast.success(item.isActive ? 'QR disabled' : 'QR enabled');
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || 'Failed to update QR status'));
    }
  };

  useEffect(() => {
    if (!previewContainerRef.current) {
      return;
    }

    const currentStyle = getStyleOption(form.stylePreset);
    const qr = previewQrRef.current || new QRCodeStyling({
      width: 320,
      height: 320,
      type: 'svg',
      data: buildQrDestination(form.code.trim() || 'PREVIEW'),
      margin: 10,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: {
        color: form.foregroundColor,
        type: currentStyle.visual.dotsType,
      },
      cornersSquareOptions: {
        color: form.foregroundColor,
        type: currentStyle.visual.cornersSquareType,
      },
      cornersDotOptions: {
        color: form.foregroundColor,
        type: currentStyle.visual.cornersDotType,
      },
      backgroundOptions: {
        color: form.backgroundColor,
      },
      image: form.logoUrl || undefined,
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 10,
        hideBackgroundDots: true,
      },
    });

    previewQrRef.current = qr;
    previewContainerRef.current.innerHTML = '';
    qr.update({
      data: buildQrDestination(form.code.trim() || 'PREVIEW'),
      dotsOptions: { color: form.foregroundColor, type: currentStyle.visual.dotsType },
      cornersSquareOptions: { color: form.foregroundColor, type: currentStyle.visual.cornersSquareType },
      cornersDotOptions: { color: form.foregroundColor, type: currentStyle.visual.cornersDotType },
      backgroundOptions: { color: form.backgroundColor },
      image: form.logoUrl || undefined,
    });
    qr.append(previewContainerRef.current);

    return () => {
      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = '';
      }
    };
  }, [form.code, form.stylePreset, form.foregroundColor, form.backgroundColor, form.logoUrl]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-2xl sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">QR Studio</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Customize it your way</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
            Add your details, change the color, style your QR code, add a logo, and test it in real time before downloading.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Live preview</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Center logo support</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Editable styles</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Download SVG</span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-widest text-slate-300">Codes</p>
            <p className="mt-2 text-2xl font-black">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-widest text-slate-300">Active</p>
            <p className="mt-2 text-2xl font-black">{activeItems}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-widest text-slate-300">Scanned</p>
            <p className="mt-2 text-2xl font-black">{totalScans}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-widest text-slate-300">Connected</p>
            <p className="mt-2 text-2xl font-black">{totalConnections}</p>
            <p className="mt-1 text-[11px] text-slate-300">{scanToConnectRate}% scan-to-connect</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Build a QR experience</h2>
            <p className="text-sm text-slate-600">Personalize the code, destination, and logo before you publish it.</p>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Real-time preview enabled
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">QR Code ID (optional)</span>
            <input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="Leave blank for auto-generated"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              disabled={Boolean(editingCode)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Template</span>
            <select
              value={form.templateId}
              onChange={(e) => setForm((prev) => ({ ...prev, templateId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Destination URL</span>
            <input
              value={form.redirectUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, redirectUrl: e.target.value }))}
              type="url"
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Logo URL (optional)</span>
            <input
              value={form.logoUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
              type="url"
              placeholder="https://.../logo.png"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <span className="mt-2 block text-xs text-slate-500">Or upload an image below. The logo will be placed in the center of the QR code.</span>
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Upload Logo Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={onLogoUpload}
              className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700 hover:file:bg-emerald-100"
            />
            {form.logoUrl ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <img src={form.logoUrl} alt="QR logo preview" className="h-12 w-12 rounded object-contain bg-white p-1" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-700">Logo ready for center placement</p>
                  <p className="truncate text-[11px] text-slate-500">{form.logoUrl.startsWith('data:') ? 'Uploaded image' : form.logoUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, logoUrl: '' }))}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </label>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="block text-sm font-medium text-slate-700">Style preset</span>
              <span className="text-xs text-slate-500">Choose a look that matches your brand</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(stylePresets.length ? stylePresets : QR_STYLE_PRESET_OPTIONS.map(({ visual: _visual, ...preset }) => preset)).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, stylePreset: preset.id }))}
                  className={`rounded-2xl border p-4 text-left transition-all ${form.stylePreset === preset.id ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <p className="text-sm font-semibold text-slate-900">{preset.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Foreground color</span>
              <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 py-2">
                <input
                  value={form.foregroundColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, foregroundColor: e.target.value }))}
                  type="color"
                  className="h-10 w-12 rounded border-0 bg-transparent p-0"
                />
                <input
                  value={form.foregroundColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, foregroundColor: e.target.value }))}
                  className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm uppercase tracking-wider text-slate-700 outline-none"
                  placeholder="#0F172A"
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Background color</span>
              <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 py-2">
                <input
                  value={form.backgroundColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                  type="color"
                  className="h-10 w-12 rounded border-0 bg-transparent p-0"
                />
                <input
                  value={form.backgroundColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                  className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm uppercase tracking-wider text-slate-700 outline-none"
                  placeholder="#FFFFFF"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Live preview</p>
                <p className="text-xs text-slate-500">This updates as you change the code, colors, style, or logo.</p>
              </div>
              <button
                type="button"
                onClick={() => previewQrRef.current?.download({ name: form.code.trim() || 'manas360-qr', extension: 'svg' })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Download SVG
              </button>
            </div>
            <div className="flex justify-center rounded-2xl bg-white p-4 shadow-inner">
              <div ref={previewContainerRef} className="min-h-[320px] min-w-[320px]" />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Tip: If you upload a logo, keep it simple and high-contrast for best scan reliability.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
            <p className="text-sm font-semibold text-slate-900">Design notes</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Use a dark foreground on a light background for stronger scans.</li>
              <li>• Rounded or classy presets give a premium, branded look.</li>
              <li>• The center logo is embedded for a more professional handoff.</li>
              <li>• Scan and connected counts are tracked per QR code below.</li>
            </ul>
            <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">What’s connected mean?</p>
              <p className="mt-1 text-emerald-800">This is a separate event ping, so you can record when a scanned QR is actually used or converted.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingCode ? 'Update QR Code' : 'Create QR Code'}
          </button>
          {editingCode && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Published QR codes</h2>
            <p className="text-sm text-slate-600">Each code is tracked for scans and optional connection events.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No QR codes created yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const template = templates.find((t) => t.id === item.templateId);
              return (
                <article key={item.code} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-900">{item.code}</p>
                      <p className="text-xs text-slate-500">{template?.name || item.templateId}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Scans</p>
                      <p className="mt-1 font-bold text-slate-900">{Number(item.scanCount || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Connected</p>
                      <p className="mt-1 font-bold text-slate-900">{Number(item.connectedCount || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Style</p>
                      <p className="mt-1 font-bold text-slate-900">{template?.name || 'Default'}</p>
                    </div>
                  </div>

                  <div className="mb-3 flex justify-center rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <QRCodeSVG
                      id={`qr-svg-${item.code}`}
                      value={buildQrDestination(item.code)}
                      size={180}
                      bgColor={item.backgroundColor || template?.back || '#FFFFFF'}
                      fgColor={item.foregroundColor || template?.fill || '#000000'}
                      level="H"
                      imageSettings={item.logoUrl ? { src: item.logoUrl, height: 40, width: 40, excavate: true } : undefined}
                    />
                  </div>

                  <p className="mb-2 line-clamp-2 text-xs text-slate-600">{item.redirectUrl}</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => toggleActive(item)}
                    >
                      {item.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => downloadQrSvg(item.code)}
                    >
                      Download SVG
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
