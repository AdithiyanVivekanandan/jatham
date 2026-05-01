const express = require('express');
const router = express.Router();
const { z } = require('zod');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { calculateBirthChart } = require('../engine/ephemeris');
const { geocode } = require('../utils/geocoder');
const { upload } = require('../utils/cloudinary');

const createProfileSchema = z.object({
  candidateName: z.string().min(2).max(100),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}$/),
  placeOfBirth: z.string().min(2).max(200),
  motherTongue: z.enum(['tamil', 'telugu', 'kannada', 'malayalam']),
  calculationMethod: z.enum(['thirukkanitha', 'vakyam']).default('thirukkanitha'),
  education: z.string().optional(),
  profession: z.string().optional()
});

// @route POST /api/profiles
// @desc Create a candidate profile
router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = createProfileSchema.parse(req.body);

    if (req.user.profileId) {
      return res.status(400).json({ error: 'User already has a profile. Use PUT /api/profiles/me to update.' });
    }

    // Geocode placeOfBirth
    const { latitude, longitude } = await geocode(data.placeOfBirth);

    // Calculate Astro Data
    const astroData = await calculateBirthChart(
      data.dateOfBirth,
      data.timeOfBirth,
      latitude,
      longitude,
      data.calculationMethod
    );

    const profile = new Profile({
      userId: req.user._id,
      candidateName: data.candidateName,
      gender: data.gender,
      dateOfBirth: new Date(data.dateOfBirth),
      timeOfBirth: data.timeOfBirth,
      placeOfBirth: data.placeOfBirth,
      latitude,
      longitude,
      motherTongue: data.motherTongue,
      education: data.education,
      profession: data.profession,
      astroData
    });

    await profile.save();

    // Link profile to user
    await User.findByIdAndUpdate(req.user._id, { profileId: profile._id });

    res.status(201).json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route GET /api/profiles/me
// @desc Get own profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user.profileId) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const profile = await Profile.findById(req.user.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route PUT /api/profiles/me
// @desc Update profile
router.put('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user.profileId) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Allow updating non-sensitive data directly
    const allowedUpdates = ['education', 'profession', 'annualIncome', 'religion', 'caste', 'subCaste', 'gothram', 'height', 'preferredAgeMin', 'preferredAgeMax'];
    const updateData = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }
    updateData.updatedAt = new Date();

    const profile = await Profile.findByIdAndUpdate(req.user.profileId, updateData, { new: true });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/profiles/me/astro
// @desc Recalculate astro data
router.post('/me/astro', authMiddleware, async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const astroData = await calculateBirthChart(
      profile.dateOfBirth,
      profile.timeOfBirth,
      profile.latitude,
      profile.longitude,
      req.body.calculationMethod || profile.astroData.calculationMethod
    );

    profile.astroData = astroData;
    profile.updatedAt = new Date();
    await profile.save();

    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/profiles/me/behavioral
// @desc Submit Big Five quiz answers
router.post('/me/behavioral', authMiddleware, async (req, res) => {
  try {
    const scoresSchema = z.object({
      openness: z.number().min(0).max(100),
      conscientiousness: z.number().min(0).max(100),
      extraversion: z.number().min(0).max(100),
      agreeableness: z.number().min(0).max(100),
      neuroticism: z.number().min(0).max(100)
    });

    const scores = scoresSchema.parse(req.body);
    
    const profile = await Profile.findById(req.user.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    profile.bigFiveScores = scores;
    profile.bigFiveCompleted = true;
    await profile.save();

    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/profiles/me/photo
// @desc Upload photo
router.post('/me/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const profile = await Profile.findById(req.user.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    profile.photoUrl = req.file.path;
    profile.photoPublicId = req.file.filename;
    await profile.save();

    res.json({ photoUrl: profile.photoUrl });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route DELETE /api/profiles/me
// @desc Deactivate profile
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    profile.isActive = false;
    await profile.save();

    res.json({ message: 'Profile deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
