const mongoose = require('mongoose');

const classNodeSchema = new mongoose.Schema(
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
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 1000 },
    order: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

classNodeSchema.index({ academicLevelId: 1, slug: 1 }, { unique: true, sparse: true });
classNodeSchema.index({ programmeId: 1, slug: 1 }, { unique: true, sparse: true });
classNodeSchema.index({ departmentId: 1, slug: 1 }, { unique: true, sparse: true });
classNodeSchema.index({ isEnabled: 1, order: 1 });

classNodeSchema.pre('validate', function ensureParent(next) {
  if (!this.academicLevelId && !this.programmeId && !this.departmentId) {
    return next(new Error('Class requires academicLevelId, programmeId, or departmentId'));
  }
  return next();
});

module.exports = mongoose.model('ClassNode', classNodeSchema);
