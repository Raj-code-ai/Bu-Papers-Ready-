const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    academicLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicLevel',
      default: null,
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
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, default: '', trim: true, maxlength: 40 },
    description: { type: String, default: '', maxlength: 1000 },
    order: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

subjectSchema.index({ name: 'text', code: 'text', description: 'text' });
subjectSchema.index({ isEnabled: 1, order: 1 });
subjectSchema.index({ classNodeId: 1, slug: 1 }, { unique: true, sparse: true });
subjectSchema.index({ semesterId: 1, slug: 1 }, { unique: true, sparse: true });
subjectSchema.index({ departmentId: 1, slug: 1 }, { unique: true, sparse: true });

subjectSchema.pre('validate', function ensureParent(next) {
  if (!this.semesterId && !this.classNodeId) {
    return next(new Error('Subject requires either semesterId or classNodeId'));
  }
  if (this.semesterId && this.classNodeId) {
    return next(new Error('Subject cannot have both semesterId and classNodeId'));
  }
  return next();
});

module.exports = mongoose.model('Subject', subjectSchema);
