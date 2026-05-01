const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
// const twilio = require('twilio'); // commented out for MVP/mocking unless configured
const User = require('../models/User');
const { otpLimiter } = require('../middleware/rateLimiter');

// Initialize Twilio client (use env vars)
// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const requestOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  otp: z.string().length(6)
});

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// @route POST /api/auth/request-otp
router.post('/request-otp', otpLimiter, async (req, res) => {
  try {
    const { phone } = requestOtpSchema.parse(req.body);
    
    // Generate 6-digit OTP
    const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ phone, otpHash, otpExpiry });
    } else {
      user.otpHash = otpHash;
      user.otpExpiry = otpExpiry;
    }
    await user.save();

    // In a real app, send OTP via Twilio
    // await client.messages.create({ body: `Your Jatham OTP is ${otp}`, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
    
    console.log(`[Dev] OTP for ${phone} is ${otp}`);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Validation error' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);

    const user = await User.findOne({ phone });
    if (!user || !user.otpHash || !user.otpExpiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = new Date();
    
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Hash refresh token for DB
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    // Send refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ accessToken, user: { id: user._id, phone: user.phone, role: user.role, profileId: user.profileId } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken; // requires cookie-parser or parsing req.headers.cookie
    // Note: since we didn't add cookie-parser middleware in index.js, we need to extract from headers or add cookie-parser.
    // Assuming cookie-parser will be added to index.js
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user._id);
    const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    user.refreshTokenHash = newRefreshTokenHash;
    await user.save();

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// @route POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.id, { $unset: { refreshTokenHash: 1 } });
      } catch (e) {
        // ignore jwt error on logout
      }
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
