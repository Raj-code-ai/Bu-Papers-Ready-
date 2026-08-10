const mongoose = require('mongoose');

const PROGRAMME_KINDS = ['stream', 'background', 'degree', 'other'];

const programmeSchema = new mongoose.Schema(
  {
    academicLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicLevel',
      required: true,
      index: true,
    },
    parentProgrammeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 1000 },
    kind: {
      type: String,
      enum: PROGRAMME_KINDS,
      default: 'other',
      index: true,
    },
    order: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

programmeSchema.index({ academicLevelId: 1, slug: 1 }, { unique: true });
programmeSchema.index({ academicLevelId: 1, isEnabled: 1, order: 1 });
programmeSchema.index({ parentProgrammeId: 1, isEnabled: 1, order: 1 });

module.exports = mongoose.model('Programme', programmeSchema);
module.exports.PROGRAMME_KINDS = PROGRAMME_KINDS;
