const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { matchLimiter } = require('../middleware/rateLimiter');
const Profile = require('../models/Profile');
const MatchResult = require('../models/MatchResult');
const { getRankedMatches, getOrComputeMatch } = require('../services/matching');
const { generateAIReport } = require('../services/ai');
const { pdfQueue } = require('../services/queue');

// @route GET /api/matches
// @desc Get ranked matches for own profile (paginated)
router.get('/', authMiddleware, matchLimiter, async (req, res) => {
  try {
    if (!req.user.profileId) {
      return res.status(404).json({ error: 'You must create a profile first to view matches' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const matches = await getRankedMatches(req.user.profileId, page, limit);
    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route GET /api/matches/saved
// @desc Get saved matches
router.get('/saved', authMiddleware, async (req, res) => {
  try {
    const savedMatches = await MatchResult.find({ savedByUsers: req.user._id })
      .populate('profileA')
      .populate('profileB');

    res.json(savedMatches);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route GET /api/matches/:profileId
// @desc Get compatibility with specific profile
router.get('/:profileId', authMiddleware, matchLimiter, async (req, res) => {
  try {
    if (!req.user.profileId) {
      return res.status(404).json({ error: 'You must create a profile first' });
    }

    const myProfile = await Profile.findById(req.user.profileId);
    const targetProfile = await Profile.findById(req.params.profileId);

    if (!myProfile || !targetProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let match = await getOrComputeMatch(myProfile, targetProfile);

    // Generate AI report if not exists
    if (!match.aiReport || !match.aiReport.generated) {
      try {
        const reportText = await generateAIReport(match, match.profileA, match.profileB);
        match.aiReport = {
          generated: true,
          reportText,
          generatedAt: new Date()
        };
        await match.save();
      } catch (err) {
        console.error('AI Report generation failed:', err);
      }
    }

    res.json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/matches/:profileId/save
// @desc Save a match
router.post('/:profileId/save', authMiddleware, async (req, res) => {
  try {
    if (!req.user.profileId) {
      return res.status(404).json({ error: 'You must create a profile first' });
    }

    const myProfile = await Profile.findById(req.user.profileId);
    const targetProfile = await Profile.findById(req.params.profileId);

    if (!myProfile || !targetProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let match = await getOrComputeMatch(myProfile, targetProfile);

    if (!match.savedByUsers.includes(req.user._id)) {
      match.savedByUsers.push(req.user._id);
      await match.save();
    }

    res.json({ message: 'Match saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/matches/:matchId/export
// @desc Trigger PDF generation (async via Bull queue)
router.post('/:matchId/export', authMiddleware, async (req, res) => {
  try {
    const match = await MatchResult.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Add to queue
    const job = await pdfQueue.add({ matchId: req.params.matchId });
    
    res.json({ message: 'PDF generation started', jobId: job.id });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route GET /api/matches/:matchId/pdf
// @desc Download generated PDF
router.get('/:matchId/pdf', authMiddleware, async (req, res) => {
  try {
    const matchId = req.params.matchId;
    const pdfDir = path.join(__dirname, '../../data/pdfs');
    const filePath = path.join(pdfDir, `${matchId}.pdf`);

    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'PDF not found or still generating' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/matches/:matchId/outcome
// @desc Log outcome
router.post('/:matchId/outcome', authMiddleware, async (req, res) => {
  try {
    const { outcome } = req.body;
    const validOutcomes = ['married', 'rejected_family', 'rejected_astrologer', 'pending', 'unknown'];
    
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({ error: 'Invalid outcome' });
    }

    const match = await MatchResult.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    match.outcome = outcome;
    match.outcomeLogged = true;
    await match.save();

    res.json({ message: 'Outcome logged successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
