const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
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
    number: { type: Number, default: null },
    description: { type: String, default: '', maxlength: 1000 },
    order: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

semesterSchema.index({ departmentId: 1, slug: 1 }, { unique: true, sparse: true });
semesterSchema.index({ programmeId: 1, slug: 1 }, { unique: true, sparse: true });
semesterSchema.index({ academicLevelId: 1, slug: 1 }, { unique: true, sparse: true });
semesterSchema.index({ isEnabled: 1, order: 1 });

semesterSchema.pre('validate', function ensureParent(next) {
  if (!this.departmentId && !this.programmeId && !this.academicLevelId) {
    return next(new Error('Semester requires academicLevelId, programmeId, or departmentId'));
  }
  return next();
});

module.exports = mongoose.model('Semester', semesterSchema);
