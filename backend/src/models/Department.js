const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    programmeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
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

departmentSchema.index({ programmeId: 1, slug: 1 }, { unique: true });
departmentSchema.index({ programmeId: 1, isEnabled: 1, order: 1 });

module.exports = mongoose.model('Department', departmentSchema);
