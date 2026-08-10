const fs = require('fs');
const path = require('path');
const { WebsiteSettings, SystemConfig } = require('../models');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const { writeAuditLog } = require('./auditLog.service');

const DEFAULT_BRANDING = {
  institutionName: 'Academic Institution',
  shortName: 'ARMS',
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
  supportEmail: '',
  footerText: '',
  socialLinks: {},
  developerContactEmail: '',
  developerPortfolioUrl: '',
  developerGithubUrl: '',
  developerLinkedinUrl: '',
  developers: [],
};

const DEFAULT_DEVELOPERS = [
  {
    name: 'Raj Ahmed',
    role: 'Creator | Developer',
    education: 'Bhattadev University, Bajali',
    semester: '',
    department: 'Computer Science and Engineering',
    bio: 'Raj Ahmed is a Computer Science and Engineering student interested in software development, web technologies, and building practical digital solutions.',
    photoUrl: '',
    order: 0,
    isEnabled: true,
  },
  {
    name: 'Sahil Haque',
    role: 'Creator',
    education: 'Bhattadev University, Bajali',
    semester: '',
    department: 'Mathematics Department',
    bio: 'Sahil Haque is a Mathematics student who contributed to the creation and development of this platform.',
    photoUrl: '',
    order: 1,
    isEnabled: true,
  },
];

const DEVELOPERS_DIR = path.resolve(__dirname, '../../uploads/developers');

function ensureDevelopersDir() {
  fs.mkdirSync(DEVELOPERS_DIR, { recursive: true });
}

function absolutePhotoUrl(photoUrl) {
  if (!photoUrl) return '';
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  const base = (env.apiBaseUrl || 'http://localhost:3008').replace(/\/$/, '');
  return `${base}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
}

function mapDeveloper(d) {
  return {
    id: d._id?.toString?.() || d.id,
    name: d.name,
    photoUrl: absolutePhotoUrl(d.photoUrl || ''),
    bio: d.bio || '',
    role: d.role || 'Developer',
    education: d.education || '',
    semester: d.semester || '',
    department: d.department || '',
    skills: d.skills || [],
    github: d.github || '',
    linkedin: d.linkedin || '',
    portfolio: d.portfolio || '',
    email: d.email || '',
    order: d.order || 0,
    isEnabled: d.isEnabled !== false,
  };
}

async function getWebsiteSettingsDoc() {
  let doc = await WebsiteSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await WebsiteSettings.create({
      key: 'default',
      ...DEFAULT_BRANDING,
      developers: DEFAULT_DEVELOPERS,
    });
  } else if (!doc.developers || doc.developers.length === 0) {
    doc.developers = DEFAULT_DEVELOPERS;
    await doc.save();
  }
  return doc;
}

function toPublicBranding(doc) {
  const plain = doc.toObject ? doc.toObject() : doc;
  const defaultName = DEFAULT_BRANDING.institutionName;
  const rawInstitution = (plain.institutionName || '').trim();
  const rawSite = (plain.siteName || '').trim();
  const institutionName =
    (rawInstitution && rawInstitution !== defaultName ? rawInstitution : null) ||
    rawSite ||
    rawInstitution ||
    defaultName;

  return {
    institutionName,
    shortName: plain.shortName || DEFAULT_BRANDING.shortName,
    siteName: rawSite || institutionName || DEFAULT_BRANDING.siteName,
    tagline: plain.tagline || DEFAULT_BRANDING.tagline,
    aboutText: plain.aboutText || DEFAULT_BRANDING.aboutText,
    logoUrl: absolutePhotoUrl(plain.logoUrl || ''),
    faviconUrl: absolutePhotoUrl(plain.faviconUrl || ''),
    primaryColor: plain.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: plain.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    accentColor: plain.accentColor || DEFAULT_BRANDING.accentColor,
    address: plain.address || '',
    officialEmail: plain.officialEmail || plain.supportEmail || '',
    officialPhone: plain.officialPhone || '',
    officialWebsite: plain.officialWebsite || '',
    supportEmail: plain.supportEmail || plain.officialEmail || '',
    footerText: plain.footerText || '',
    socialLinks: plain.socialLinks || {},
    developerContactEmail: plain.developerContactEmail || '',
    developerPortfolioUrl: plain.developerPortfolioUrl || '',
    developerGithubUrl: plain.developerGithubUrl || '',
    developerLinkedinUrl: plain.developerLinkedinUrl || '',
    developers: (plain.developers || [])
      .filter((d) => d.isEnabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(mapDeveloper),
  };
}

async function getPublicSiteConfig() {
  const [settings, system] = await Promise.all([
    getWebsiteSettingsDoc(),
    SystemConfig.findOne({ key: 'default' }).lean(),
  ]);

  return {
    branding: toPublicBranding(settings),
    maintenanceMode: Boolean(system?.maintenanceMode),
    maintenanceMessage:
      system?.maintenanceMessage ||
      'Website temporarily unavailable while maintenance is being performed.',
    maintenanceBlockPublic: system?.maintenanceBlockPublic !== false,
  };
}

async function updateWebsiteSettings(actor, body) {
  const doc = await getWebsiteSettingsDoc();
  const allowed = [
    'institutionName',
    'shortName',
    'siteName',
    'tagline',
    'aboutText',
    'logoUrl',
    'faviconUrl',
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'address',
    'officialEmail',
    'officialPhone',
    'officialWebsite',
    'supportEmail',
    'footerText',
    'socialLinks',
    'developerContactEmail',
    'developerPortfolioUrl',
    'developerGithubUrl',
    'developerLinkedinUrl',
    'darkModeDefault',
  ];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      doc[key] = body[key];
    }
  }

  if (body.institutionName !== undefined || body.siteName !== undefined) {
    const name = String(body.institutionName || body.siteName || '').trim();
    if (name) {
      doc.institutionName = String(body.institutionName || name).trim() || name;
      doc.siteName = String(body.siteName || name).trim() || name;
    }
  }

  doc.updatedBy = actor._id;
  await doc.save();
  return toPublicBranding(doc);
}

async function listDevelopers() {
  const doc = await getWebsiteSettingsDoc();
  return (doc.developers || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(mapDeveloper);
}

function pickDeveloperFields(body = {}) {
  const fields = {};
  const keys = [
    'name',
    'role',
    'bio',
    'education',
    'semester',
    'department',
    'github',
    'linkedin',
    'portfolio',
    'email',
    'photoUrl',
    'order',
    'isEnabled',
  ];
  for (const key of keys) {
    if (body[key] !== undefined) {
      fields[key] = body[key];
    }
  }
  if (body.skills !== undefined) {
    fields.skills = Array.isArray(body.skills)
      ? body.skills
      : String(body.skills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  }
  return fields;
}

async function createDeveloper(actor, body, context = {}) {
  const doc = await getWebsiteSettingsDoc();
  const fields = pickDeveloperFields(body);
  if (!fields.name || !String(fields.name).trim()) {
    throw new AppError('Developer name is required', 400, 'VALIDATION_ERROR');
  }
  fields.name = String(fields.name).trim();
  fields.role = fields.role || 'Developer';
  fields.order = Number.isFinite(Number(fields.order))
    ? Number(fields.order)
    : doc.developers.length;

  doc.developers.push(fields);
  doc.updatedBy = actor._id;
  await doc.save();

  const created = doc.developers[doc.developers.length - 1];
  await writeAuditLog({
    action: 'SUPERADMIN_CREATE_DEVELOPER',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'Developer',
    entityId: created._id.toString(),
    after: { name: created.name, role: created.role },
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  });

  return mapDeveloper(created);
}

async function updateDeveloper(actor, developerId, body, context = {}) {
  const doc = await getWebsiteSettingsDoc();
  const developer = doc.developers.id(developerId);
  if (!developer) throw new AppError('Developer not found', 404, 'NOT_FOUND');

  const before = { name: developer.name, role: developer.role };
  const fields = pickDeveloperFields(body);
  Object.assign(developer, fields);
  if (fields.name) developer.name = String(fields.name).trim();
  doc.updatedBy = actor._id;
  await doc.save();

  await writeAuditLog({
    action: 'SUPERADMIN_UPDATE_DEVELOPER',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'Developer',
    entityId: developerId,
    before,
    after: { name: developer.name, role: developer.role },
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  });

  return mapDeveloper(developer);
}

async function deleteDeveloper(actor, developerId, context = {}) {
  const doc = await getWebsiteSettingsDoc();
  const developer = doc.developers.id(developerId);
  if (!developer) throw new AppError('Developer not found', 404, 'NOT_FOUND');

  const before = { name: developer.name };
  const photoUrl = developer.photoUrl || '';
  developer.deleteOne();
  doc.updatedBy = actor._id;
  await doc.save();

  if (photoUrl.startsWith('/uploads/developers/')) {
    const filename = path.basename(photoUrl);
    const full = path.join(DEVELOPERS_DIR, filename);
    try {
      fs.unlinkSync(full);
    } catch {
      /* ignore missing file */
    }
  }

  await writeAuditLog({
    action: 'SUPERADMIN_DELETE_DEVELOPER',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'Developer',
    entityId: developerId,
    before,
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  });

  return { deleted: true, id: developerId };
}

async function uploadDeveloperPhoto(actor, developerId, file, context = {}) {
  if (!file || !file.buffer) {
    throw new AppError('Image file is required', 400, 'VALIDATION_ERROR');
  }

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowed.has(file.mimetype)) {
    throw new AppError('Only JPEG, PNG, WebP, or GIF images are allowed', 400, 'INVALID_FILE_TYPE');
  }

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError('Image must be 2 MB or smaller', 413, 'PAYLOAD_TOO_LARGE');
  }

  const doc = await getWebsiteSettingsDoc();
  const developer = doc.developers.id(developerId);
  if (!developer) throw new AppError('Developer not found', 404, 'NOT_FOUND');

  ensureDevelopersDir();
  const ext =
    file.mimetype === 'image/png'
      ? '.png'
      : file.mimetype === 'image/webp'
        ? '.webp'
        : file.mimetype === 'image/gif'
          ? '.gif'
          : '.jpg';
  const filename = `${developerId}-${Date.now()}${ext}`;
  const fullPath = path.join(DEVELOPERS_DIR, filename);
  fs.writeFileSync(fullPath, file.buffer);

  if (developer.photoUrl && developer.photoUrl.startsWith('/uploads/developers/')) {
    const old = path.join(DEVELOPERS_DIR, path.basename(developer.photoUrl));
    try {
      fs.unlinkSync(old);
    } catch {
      /* ignore */
    }
  }

  developer.photoUrl = `/uploads/developers/${filename}`;
  doc.updatedBy = actor._id;
  await doc.save();

  await writeAuditLog({
    action: 'SUPERADMIN_UPLOAD_DEVELOPER_PHOTO',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'Developer',
    entityId: developerId,
    after: { photoUrl: developer.photoUrl, name: developer.name },
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  });

  return mapDeveloper(developer);
}

const BRANDING_DIR = path.resolve(__dirname, '../../uploads/branding');

function ensureBrandingDir() {
  fs.mkdirSync(BRANDING_DIR, { recursive: true });
}

function unlinkLocalUpload(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') return;
  if (!urlPath.startsWith('/uploads/branding/') && !urlPath.startsWith('/uploads/developers/')) {
    return;
  }
  const full = path.join(path.resolve(__dirname, '../..'), urlPath.replace(/^\//, ''));
  try {
    fs.unlinkSync(full);
  } catch {
    /* ignore */
  }
}

async function uploadBrandingImage(actor, kind, file, context = {}) {
  const field = kind === 'favicon' ? 'faviconUrl' : 'logoUrl';
  if (kind !== 'logo' && kind !== 'favicon') {
    throw new AppError('Invalid branding image type', 400, 'VALIDATION_ERROR');
  }
  if (!file || !file.buffer) {
    throw new AppError('Image file is required', 400, 'VALIDATION_ERROR');
  }

  const logoTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const faviconTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ]);
  const allowed = kind === 'favicon' ? faviconTypes : logoTypes;
  if (!allowed.has(file.mimetype)) {
    throw new AppError(
      kind === 'favicon'
        ? 'Favicon must be ICO, PNG, JPEG, WebP, or GIF'
        : 'Logo must be JPEG, PNG, WebP, or GIF',
      400,
      'INVALID_FILE_TYPE'
    );
  }

  const maxBytes = kind === 'favicon' ? 512 * 1024 : 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError(
      kind === 'favicon' ? 'Favicon must be 512 KB or smaller' : 'Logo must be 2 MB or smaller',
      413,
      'PAYLOAD_TOO_LARGE'
    );
  }

  const doc = await getWebsiteSettingsDoc();
  ensureBrandingDir();

  const ext =
    file.mimetype === 'image/png'
      ? '.png'
      : file.mimetype === 'image/webp'
        ? '.webp'
        : file.mimetype === 'image/gif'
          ? '.gif'
          : file.mimetype.includes('icon')
            ? '.ico'
            : '.jpg';

  const filename = `${kind}-${Date.now()}${ext}`;
  const fullPath = path.join(BRANDING_DIR, filename);
  fs.writeFileSync(fullPath, file.buffer);

  unlinkLocalUpload(doc[field]);
  doc[field] = `/uploads/branding/${filename}`;
  doc.updatedBy = actor._id;
  await doc.save();

  await writeAuditLog({
    action: kind === 'favicon' ? 'SUPERADMIN_UPLOAD_FAVICON' : 'SUPERADMIN_UPLOAD_LOGO',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'WebsiteSettings',
    entityId: doc._id.toString(),
    after: { [field]: doc[field] },
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  });

  return toPublicBranding(doc);
}

module.exports = {
  DEFAULT_BRANDING,
  DEFAULT_DEVELOPERS,
  getWebsiteSettingsDoc,
  getPublicSiteConfig,
  toPublicBranding,
  updateWebsiteSettings,
  listDevelopers,
  createDeveloper,
  updateDeveloper,
  deleteDeveloper,
  uploadDeveloperPhoto,
  uploadBrandingImage,
};
