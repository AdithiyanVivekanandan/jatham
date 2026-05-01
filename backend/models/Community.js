const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: String,
  adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inviteCode: { type: String, unique: true },
  memberCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  city: String,
  state: String
});

module.exports = mongoose.model('Community', CommunitySchema);
