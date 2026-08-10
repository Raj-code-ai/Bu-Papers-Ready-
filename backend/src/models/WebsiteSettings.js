const mongoose = require('mongoose');

const socialLinksSchema = new mongoose.Schema(
  {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
    linkedin: { type: String, default: '' },
  },
  { _id: false }
);

const developerProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 2000 },
    role: { type: String, default: 'Developer', trim: true },
    education: { type: String, default: '', trim: true, maxlength: 200 },
    semester: { type: String, default: '', trim: true, maxlength: 120 },
    department: { type: String, default: '', trim: true, maxlength: 200 },
    skills: { type: [String], default: [] },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    email: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const websiteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },

    // Institution branding (white-label)
    institutionName: { type: String, default: 'Academic Institution' },
    shortName: { type: String, default: 'ARMS' },
    siteName: { type: String, default: 'Question Papers Platform' },
    tagline: { type: String, default: 'Browse, view, and download academic question papers' },
    aboutText: {
      type: String,
      default:
        'This platform provides authorized academic question papers and resources for students of this institution.',
    },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#0F766E' },
    secondaryColor: { type: String, default: '#134E4A' },
    accentColor: { type: String, default: '#14B8A6' },

    // Institution contact
    address: { type: String, default: '' },
    officialEmail: { type: String, default: '' },
    officialPhone: { type: String, default: '' },
    officialWebsite: { type: String, default: '' },
    supportEmail: { type: String, default: '' },
    footerText: { type: String, default: '' },
    socialLinks: { type: socialLinksSchema, default: () => ({}) },

    // Platform developer contact (separate from institution)
    developerContactEmail: { type: String, default: '' },
    developerPortfolioUrl: { type: String, default: '' },
    developerGithubUrl: { type: String, default: '' },
    developerLinkedinUrl: { type: String, default: '' },
    developers: { type: [developerProfileSchema], default: [] },

    darkModeDefault: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema);
