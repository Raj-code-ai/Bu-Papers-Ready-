const mongoose = require('mongoose');

const ACADEMIC_LEVEL_KINDS = ['school_band', 'ug', 'pg', 'other'];

const academicLevelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 1000 },
    kind: {
      type: String,
      enum: ACADEMIC_LEVEL_KINDS,
      default: 'other',
      index: true,
    },
    order: { type: Number, default: 0, index: true },
    isEnabled: { type: Boolean, default: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

academicLevelSchema.index({ isEnabled: 1, order: 1 });
academicLevelSchema.index({ kind: 1, isEnabled: 1, order: 1 });

module.exports = mongoose.model('AcademicLevel', academicLevelSchema);
module.exports.ACADEMIC_LEVEL_KINDS = ACADEMIC_LEVEL_KINDS;
