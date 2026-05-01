const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Identity
  phone: { type: String, required: true, unique: true }, // [ENCRYPTED]
  email: { type: String, sparse: true },
  role: { type: String, enum: ['parent', 'candidate', 'admin'], default: 'parent' },
  
  // Auth
  refreshTokenHash: String,
  otpHash: String,
  otpExpiry: Date,
  isVerified: { type: Boolean, default: false },
  
  // Linked profile
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
  
  // Meta
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' }
});

module.exports = mongoose.model('User', UserSchema);
