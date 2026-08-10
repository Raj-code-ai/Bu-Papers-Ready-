const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['view', 'download'],
      required: true,
      index: true,
    },
    ipHash: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ paperId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
