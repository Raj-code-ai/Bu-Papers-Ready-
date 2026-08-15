import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { publicApi } from '../services/endpoints';

const InstitutionContext = createContext(null);
const BRANDING_CACHE_KEY = 'arms_site_branding_v2';

const FALLBACK = {
  institutionName: '',
  shortName: '',
  siteName: '',
  tagline: '',
  aboutText: '',
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

function readCachedBranding() {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return { ...FALLBACK, ...parsed };
  } catch {
    return null;
  }
}

function writeCachedBranding(branding) {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch {
    // ignore quota / private mode
  }
}

function normalizeBranding(data) {
  const branding = { ...FALLBACK, ...(data?.branding || {}) };
  if (!branding.institutionName && branding.siteName) {
    branding.institutionName = branding.siteName;
  }
  return branding;
}

function applySiteConfig(data, setBranding, setMaintenance) {
  const branding = normalizeBranding(data);
  setBranding(branding);
  writeCachedBranding(branding);
  setMaintenance({
    enabled: Boolean(data?.maintenanceMode && data?.maintenanceBlockPublic !== false),
    message:
      data?.maintenanceMessage ||
      'Website temporarily unavailable while maintenance is being performed.',
  });
  return branding;
}

export function InstitutionProvider({ children }) {
  const [branding, setBranding] = useState(() => readCachedBranding() || FALLBACK);
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: 'Website temporarily unavailable while maintenance is being performed.',
  });
  const [loading, setLoading] = useState(() => !readCachedBranding());
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const res = await publicApi.siteConfig();
    const data = res.data.data;
    applySiteConfig(data, setBranding, setMaintenance);
    setError('');
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Unable to load institution settings.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      refresh().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  useEffect(() => {
    const titleName = branding.institutionName || branding.shortName || branding.siteName;
    if (titleName) {
      document.title = `${titleName} · Question Papers`;
    }
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

  const ready = !loading || Boolean(branding.institutionName || branding.siteName || branding.logoUrl);

  const value = useMemo(
    () => ({
      branding,
      maintenance,
      loading,
      ready,
      error,
      refresh,
      applyBranding: (partial) => {
        setBranding((prev) => {
          const next = { ...prev, ...partial };
          writeCachedBranding(next);
          return next;
        });
      },
    }),
    [branding, maintenance, loading, ready, error, refresh]
  );

  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>;
}

export function useInstitution() {
  const ctx = useContext(InstitutionContext);
  if (!ctx) throw new Error('useInstitution must be used within InstitutionProvider');
  return ctx;
}
