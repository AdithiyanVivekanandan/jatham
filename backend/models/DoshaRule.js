const mongoose = require('mongoose');

const DoshaRuleSchema = new mongoose.Schema({
  doshaName: { type: String, required: true }, // e.g. 'chevvai', 'rajju', 'nadi'
  triggerCondition: Object, // JSON describing trigger (e.g. { marsHouse: [1,2,4,7,8,12] })
  severity: { type: String, enum: ['mild', 'severe'] },
  cancellationRules: [{
    condition: String, // human-readable description
    cancellationLogic: Object // JSON describing what cancels this dosha
  }],
  isActive: { type: Boolean, default: true },
  source: String // e.g. "Brihat Parashara Hora Shastra, Ch. 18"
});

module.exports = mongoose.model('DoshaRule', DoshaRuleSchema);
