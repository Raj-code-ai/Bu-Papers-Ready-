import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { publicApi } from '../services/endpoints';

const InstitutionContext = createContext(null);

const FALLBACK = {
  institutionName: 'Academic Institution',
  shortName: '',
  siteName: 'Question Papers Platform',
  tagline: 'Browse, view, and download academic question papers',
  aboutText:
    'This platform provides authorized academic question papers and resources for students of this institution.',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#0F766E',
  secondaryColor: '#134E4A',
  accentColor: '#14B8A6',
  address: '',
  officialEmail: '',
  officialPhone: '',
  officialWebsite: '',
  footerText: '',
  socialLinks: {},
  developers: [],
  developerContactEmail: '',
  developerPortfolioUrl: '',
  developerGithubUrl: '',
  developerLinkedinUrl: '',
};

function applySiteConfig(data, setBranding, setMaintenance) {
  const branding = { ...FALLBACK, ...(data?.branding || {}) };
  // Prefer explicit institution name; keep shortName only as secondary label.
  if (!branding.institutionName && branding.siteName) {
    branding.institutionName = branding.siteName;
  }
  setBranding(branding);
  setMaintenance({
    enabled: Boolean(data?.maintenanceMode && data?.maintenanceBlockPublic !== false),
    message:
      data?.maintenanceMessage ||
      'Website temporarily unavailable while maintenance is being performed.',
  });
  return branding;
}

export function InstitutionProvider({ children }) {
  const [branding, setBranding] = useState(FALLBACK);
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: 'Website temporarily unavailable while maintenance is being performed.',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const res = await publicApi.siteConfig();
    const data = res.data.data;
    applySiteConfig(data, setBranding, setMaintenance);
    setError('');
    return data;
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => {
        setError(err.response?.data?.message || 'Unable to load institution settings.');
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  // Pick up Super Admin branding changes when returning to the tab.
  useEffect(() => {
    const onFocus = () => {
      refresh().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  useEffect(() => {
    document.title = `${branding.institutionName || branding.shortName} · Question Papers`;
    const root = document.documentElement;
    root.style.setProperty('--brand', branding.primaryColor || FALLBACK.primaryColor);
    root.style.setProperty('--brand-deep', branding.secondaryColor || FALLBACK.secondaryColor);
    if (branding.faviconUrl) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [branding]);

  const value = useMemo(
    () => ({
      branding,
      maintenance,
      loading,
      error,
      refresh,
      applyBranding: (partial) => {
        setBranding((prev) => ({ ...prev, ...partial }));
      },
    }),
    [branding, maintenance, loading, error, refresh]
  );

  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>;
}

export function useInstitution() {
  const ctx = useContext(InstitutionContext);
  if (!ctx) throw new Error('useInstitution must be used within InstitutionProvider');
  return ctx;
}
