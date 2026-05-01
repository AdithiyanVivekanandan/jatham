const mongoose = require('mongoose');

const MatchResultSchema = new mongoose.Schema({
  profileA: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  profileB: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  
  // Porutham scores (each: 'pass' | 'conditional' | 'fail')
  poruthams: {
    dina:         { result: String, detail: String },
    gana:         { result: String, detail: String },
    yoni:         { result: String, detail: String },
    rasi:         { result: String, detail: String },
    rasiAthipathi:{ result: String, detail: String },
    rajju:        { result: String, detail: String, isCritical: Boolean },
    vedha:        { result: String, detail: String },
    vasya:        { result: String, detail: String },
    mahendra:     { result: String, detail: String },
    streeDeergha: { result: String, detail: String }
  },
  
  // Dosha analysis
  doshaAnalysis: {
    chevvaiSamyam: Boolean, // mutual cancellation
    nadiDosham: Boolean,
    nadiSamyam: Boolean
  },
  
  // Aggregate
  passCount: Number, // out of 10
  conditionalCount: Number,
  failCount: Number,
  hasHardReject: Boolean, // true if Rajju or Vedha failed with no samyam
  overallScore: Number, // 0-100 normalized
  
  // AI-generated report (generated async)
  aiReport: {
    generated: { type: Boolean, default: false },
    reportText: String,
    riskZones: [String],
    recommendations: [String],
    generatedAt: Date
  },
  
  // User actions
  savedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  exportedAt: [Date],
  
  // Dataset logging (for future ML — do not skip this)
  outcomeLogged: { type: Boolean, default: false },
  outcome: { type: String, enum: ['married', 'rejected_family', 'rejected_astrologer', 'pending', 'unknown'] },
  
  calculatedAt: { type: Date, default: Date.now },
  calculationMethod: { type: String, enum: ['thirukkanitha', 'vakyam'] }
});

MatchResultSchema.index({ profileA: 1, profileB: 1 }, { unique: true });

module.exports = mongoose.model('MatchResult', MatchResultSchema);
