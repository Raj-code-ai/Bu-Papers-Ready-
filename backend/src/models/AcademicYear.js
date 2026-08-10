const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },
    isCurrent: { type: Boolean, default: false, index: true },
    isEnabled: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

academicYearSchema.index({ isEnabled: 1, order: -1 });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
