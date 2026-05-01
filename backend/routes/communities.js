const express = require('express');
const router = express.Router();
const Community = require('../models/Community');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// @route POST /api/communities
// @desc Create community (admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, inviteCode, city, state } = req.body;

    const existing = await Community.findOne({ inviteCode });
    if (existing) {
      return res.status(400).json({ error: 'Invite code already in use' });
    }

    const community = new Community({
      name,
      adminUserId: req.user._id,
      inviteCode,
      city,
      state
    });

    await community.save();
    res.status(201).json(community);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route GET /api/communities/:code
// @desc Get community by invite code (public)
router.get('/:code', async (req, res) => {
  try {
    const community = await Community.findOne({ inviteCode: req.params.code, isActive: true });
    if (!community) {
      return res.status(404).json({ error: 'Community not found or inactive' });
    }
    // Return safe data
    res.json({
      name: community.name,
      city: community.city,
      state: community.state,
      memberCount: community.memberCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/communities/:code/join
// @desc Join community
router.post('/:code/join', authMiddleware, async (req, res) => {
  try {
    const community = await Community.findOne({ inviteCode: req.params.code, isActive: true });
    if (!community) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Update User
    req.user.communityId = community._id;
    await req.user.save();

    // If profile exists, update profile
    if (req.user.profileId) {
      await Profile.findByIdAndUpdate(req.user.profileId, { communityId: community._id });
    }

    // Increment member count
    community.memberCount += 1;
    await community.save();

    res.json({ message: 'Joined community successfully', communityName: community.name });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
