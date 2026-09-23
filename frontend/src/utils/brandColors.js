export const DEFAULT_BRAND_COLORS = {
  primaryColor: '#1E4BD8',
  secondaryColor: '#1E3A8A',
  accentColor: '#C45A28',
};

export function normalizeHex(value, fallback = DEFAULT_BRAND_COLORS.primaryColor) {
  const raw = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.slice(1).toUpperCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const body = raw.slice(1);
    return `#${body
      .split('')
      .map((ch) => `${ch}${ch}`)
      .join('')
      .toUpperCase()}`;
  }
  return fallback;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex, '');
  if (!normalized) return null;
  const num = parseInt(normalized.slice(1), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function mix(hex, target, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return toHex(rgb.map((c, i) => Math.round(c + (target[i] - c) * amount)));
}

function lighten(hex, amount) {
  return mix(hex, [255, 255, 255], amount);
}

function darken(hex, amount) {
  return mix(hex, [0, 0, 0], amount);
}

export function applyBrandCssVars(branding, theme = 'light') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = normalizeHex(branding?.primaryColor, DEFAULT_BRAND_COLORS.primaryColor);
  const deep = normalizeHex(branding?.secondaryColor, DEFAULT_BRAND_COLORS.secondaryColor);
  const accent = normalizeHex(branding?.accentColor, DEFAULT_BRAND_COLORS.accentColor);
  const isDark = theme === 'dark';

  const brand = isDark ? lighten(primary, 0.22) : primary;
  const brandHover = isDark ? lighten(primary, 0.34) : darken(primary, 0.12);
  const brandDeep = isDark ? primary : deep;
  const moss500 = hexToRgb(brand);
  const moss400 = hexToRgb(brandHover);
  const moss300 = hexToRgb(lighten(primary, 0.48));
  const grain = hexToRgb(accent);

  root.style.setProperty('--brand', brand);
  root.style.setProperty('--brand-hover', brandHover);
  root.style.setProperty('--brand-deep', brandDeep);
  root.style.setProperty('--brand-accent', accent);
  if (moss500) root.style.setProperty('--moss-500', moss500.join(' '));
  if (moss400) root.style.setProperty('--moss-400', moss400.join(' '));
  if (moss300) root.style.setProperty('--moss-300', moss300.join(' '));
  if (grain) root.style.setProperty('--grain', grain.join(' '));
}
