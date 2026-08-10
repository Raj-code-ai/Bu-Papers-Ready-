const mongoose = require('mongoose');

const storageMetaSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, default: 'cloudinary' },
    providerKey: { type: String, required: true },
    url: { type: String, required: true },
    secureUrl: { type: String, default: '' },
    format: { type: String, default: 'pdf' },
    bytes: { type: Number, default: 0 },
    resourceType: { type: String, default: 'raw' },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const paperSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 250, index: true },
    description: { type: String, default: '', maxlength: 5000 },
    academicLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicLevel',
      required: true,
      index: true,
    },
    programmeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      default: null,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      default: null,
      index: true,
    },
    classNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassNode',
      default: null,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    resourceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceType',
      required: true,
      index: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null,
      index: true,
    },
    paperTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaperType',
      default: null,
      index: true,
    },
    fileName: { type: String, required: true, unique: true },
    originalFileName: { type: String, required: true },
    mimeType: {
      type: String,
      required: true,
      enum: ['application/pdf'],
      default: 'application/pdf',
    },
    fileSizeBytes: { type: Number, required: true, min: 1 },
    fileHash: { type: String, required: true, index: true },
    storage: { type: storageMetaSchema, required: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    viewCount: { type: Number, default: 0, min: 0, index: true },
    downloadCount: { type: Number, default: 0, min: 0, index: true },
    isDuplicateSuspect: { type: Boolean, default: false, index: true },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      default: null,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    permanentlyDeletedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'draft',
      index: true,
    },
    tags: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);

paperSchema.index({
  subjectId: 1,
  academicYearId: 1,
  resourceTypeId: 1,
  isDeleted: 1,
  status: 1,
});
paperSchema.index({ isDeleted: 1, deletedAt: 1 });
paperSchema.index({ createdAt: -1 });
paperSchema.index({ viewCount: -1 });
paperSchema.index({ downloadCount: -1 });
paperSchema.index({ title: 'text', description: 'text', originalFileName: 'text', tags: 'text' });
paperSchema.index({ academicLevelId: 1, departmentId: 1, isDeleted: 1, status: 1 });

paperSchema.pre('validate', function ensureHierarchy(next) {
  if (!this.semesterId && !this.classNodeId) {
    return next(new Error('Paper requires either semesterId or classNodeId'));
  }
  if (this.semesterId && this.classNodeId) {
    return next(new Error('Paper cannot have both semesterId and classNodeId'));
  }
  return next();
});

module.exports = mongoose.model('Paper', paperSchema);
