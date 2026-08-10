import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { useInstitution } from '../../store/InstitutionContext';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function SuperAdminInstitutionPage() {
  const { refresh, applyBranding } = useInstitution();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    superAdminApi
      .getWebsite()
      .then((res) => {
        const data = res.data.data;
        setForm({
          institutionName: data.institutionName || data.siteName || '',
          shortName: data.shortName || '',
          siteName: data.siteName || data.institutionName || '',
          tagline: data.tagline || '',
          aboutText: data.aboutText || '',
          logoUrl: data.logoUrl || '',
          faviconUrl: data.faviconUrl || '',
          primaryColor: data.primaryColor || '#0F766E',
          secondaryColor: data.secondaryColor || '#134E4A',
          accentColor: data.accentColor || '#14B8A6',
          address: data.address || '',
          officialEmail: data.officialEmail || data.supportEmail || '',
          officialPhone: data.officialPhone || '',
          officialWebsite: data.officialWebsite || '',
          footerText: data.footerText || '',
          developerContactEmail: data.developerContactEmail || '',
          developerPortfolioUrl: data.developerPortfolioUrl || '',
          developerGithubUrl: data.developerGithubUrl || '',
          developerLinkedinUrl: data.developerLinkedinUrl || '',
        });
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  function applySavedBranding(saved, payload) {
    applyBranding({
      institutionName: saved.institutionName || payload?.institutionName,
      shortName: saved.shortName ?? payload?.shortName,
      siteName: saved.siteName || payload?.siteName,
      tagline: saved.tagline ?? payload?.tagline,
      aboutText: saved.aboutText ?? payload?.aboutText,
      logoUrl: saved.logoUrl ?? payload?.logoUrl,
      faviconUrl: saved.faviconUrl ?? payload?.faviconUrl,
      primaryColor: saved.primaryColor ?? payload?.primaryColor,
      secondaryColor: saved.secondaryColor ?? payload?.secondaryColor,
      accentColor: saved.accentColor ?? payload?.accentColor,
      address: saved.address ?? payload?.address,
      officialEmail: saved.officialEmail ?? payload?.officialEmail,
      officialPhone: saved.officialPhone ?? payload?.officialPhone,
      officialWebsite: saved.officialWebsite ?? payload?.officialWebsite,
      footerText: saved.footerText ?? payload?.footerText,
      developerContactEmail: saved.developerContactEmail ?? payload?.developerContactEmail,
      developerPortfolioUrl: saved.developerPortfolioUrl ?? payload?.developerPortfolioUrl,
      developerGithubUrl: saved.developerGithubUrl ?? payload?.developerGithubUrl,
      developerLinkedinUrl: saved.developerLinkedinUrl ?? payload?.developerLinkedinUrl,
    });
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        siteName: form.siteName?.trim() || form.institutionName,
        institutionName: form.institutionName?.trim(),
      };
      const res = await superAdminApi.updateWebsite(payload);
      const saved = res.data.data || payload;
      applySavedBranding(saved, payload);
      await refresh();
      setForm((f) => ({
        ...f,
        ...payload,
        logoUrl: saved.logoUrl || f.logoUrl,
        faviconUrl: saved.faviconUrl || f.faviconUrl,
      }));
      setMessage('Institution branding saved. The public site now shows the updated name.');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(kind, file) {
    if (!file) return;
    setUploading(kind);
    setMessage('');
    setError('');
    try {
      const body = new FormData();
      body.append('photo', file);
      const res =
        kind === 'favicon'
          ? await superAdminApi.uploadWebsiteFavicon(body)
          : await superAdminApi.uploadWebsiteLogo(body);
      const saved = res.data.data || {};
      setForm((f) => ({
        ...f,
        logoUrl: saved.logoUrl ?? f.logoUrl,
        faviconUrl: saved.faviconUrl ?? f.faviconUrl,
      }));
      applySavedBranding(saved, form);
      await refresh();
      setMessage(kind === 'favicon' ? 'Favicon uploaded.' : 'Logo uploaded.');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploading('');
    }
  }

  if (loading) return <LoadingSkeleton rows={6} />;
  if (!form) return <ErrorState message={error || 'Unable to load settings'} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Institution branding</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Changes appear on the public Home, About, Contact, and navigation immediately.
        </p>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      <div className="panel grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-display text-xl">Logo</h2>
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt="Institution logo preview"
              className="h-20 w-20 rounded-xl border border-ink-700/10 object-contain bg-white p-1 dark:border-white/10"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-ink-700/20 text-xs text-ink-700/50">
              No logo
            </div>
          )}
          <label className="btn-secondary inline-flex !py-1.5 cursor-pointer">
            {uploading === 'logo' ? 'Uploading...' : 'Upload logo from computer'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={Boolean(uploading)}
              onChange={(e) => onUpload('logo', e.target.files?.[0])}
            />
          </label>
          <p className="text-xs text-ink-700/60">JPEG, PNG, WebP, or GIF · max 2 MB</p>
          <label className="block text-sm">
            Or logo URL
            <input
              className="input mt-1"
              value={form.logoUrl}
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
            />
          </label>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-xl">Favicon</h2>
          {form.faviconUrl ? (
            <img
              src={form.faviconUrl}
              alt="Favicon preview"
              className="h-12 w-12 rounded border border-ink-700/10 object-contain bg-white p-1 dark:border-white/10"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-ink-700/20 text-[10px] text-ink-700/50">
              None
            </div>
          )}
          <label className="btn-secondary inline-flex !py-1.5 cursor-pointer">
            {uploading === 'favicon' ? 'Uploading...' : 'Upload favicon from computer'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/x-icon,.ico"
              className="hidden"
              disabled={Boolean(uploading)}
              onChange={(e) => onUpload('favicon', e.target.files?.[0])}
            />
          </label>
          <p className="text-xs text-ink-700/60">ICO, PNG, JPEG, WebP, or GIF · max 512 KB</p>
          <label className="block text-sm">
            Or favicon URL
            <input
              className="input mt-1"
              value={form.faviconUrl}
              onChange={(e) => setForm((f) => ({ ...f, faviconUrl: e.target.value }))}
            />
          </label>
        </div>
      </div>

      <form onSubmit={onSave} className="panel grid gap-4 md:grid-cols-2">
        {[
          ['institutionName', 'Institution name'],
          ['shortName', 'Short name (optional)'],
          ['siteName', 'Site name'],
          ['tagline', 'Tagline'],
          ['primaryColor', 'Primary color'],
          ['secondaryColor', 'Secondary color'],
          ['accentColor', 'Accent color'],
          ['address', 'Address'],
          ['officialEmail', 'Official email'],
          ['officialPhone', 'Official phone'],
          ['officialWebsite', 'Official website'],
          ['footerText', 'Footer text'],
          ['developerContactEmail', 'Developer email'],
          ['developerPortfolioUrl', 'Developer portfolio'],
          ['developerGithubUrl', 'Developer GitHub'],
          ['developerLinkedinUrl', 'Developer LinkedIn'],
        ].map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="input mt-1"
              value={form[key]}
              required={key === 'institutionName'}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        <label className="block text-sm md:col-span-2">
          About text
          <textarea
            className="input mt-1"
            rows={5}
            value={form.aboutText}
            onChange={(e) => setForm((f) => ({ ...f, aboutText: e.target.value }))}
          />
        </label>
        <button className="btn-primary md:col-span-2" disabled={saving} type="submit">
          {saving ? 'Saving...' : 'Save institution settings'}
        </button>
      </form>
    </div>
  );
}
