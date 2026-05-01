const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  // Ownership
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Candidate details
  candidateName: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  dateOfBirth: { type: Date, required: true }, // [ENCRYPTED]
  timeOfBirth: { type: String, required: true }, // HH:MM format, [ENCRYPTED]
  placeOfBirth: { type: String, required: true },
  latitude: { type: Number, required: true }, // [ENCRYPTED]
  longitude: { type: Number, required: true }, // [ENCRYPTED]
  
  // Calculated astro data (derived at profile creation, cached)
  astroData: {
    nakshatra: { type: Number, min: 1, max: 27 }, // 1-indexed
    nakshatraName: String,
    pada: { type: Number, min: 1, max: 4 },
    rasi: { type: Number, min: 1, max: 12 },
    rasiName: String,
    lagna: { type: Number, min: 1, max: 12 },
    lagnaName: String,
    moonDegree: Number,
    calculationMethod: { type: String, enum: ['thirukkanitha', 'vakyam'], default: 'thirukkanitha' },
    
    // All 10 Porutham attributes (pre-computed at profile save)
    gana: { type: String, enum: ['deva', 'manushya', 'rakshasa'] },
    yoniAnimal: String,
    yoniGender: { type: String, enum: ['male', 'female'] },
    rajjuGroup: { type: String, enum: ['siro', 'kanta', 'nabhi', 'kati', 'pada'] },
    rajjuDirection: { type: String, enum: ['ascending', 'descending', 'stationary'] },
    vedhaPartner: Number, // nakshatra number that causes vedha
    vasya: String,
    planetLord: String,
    rasiLord: String,
    
    // Dosha flags
    chevvaiDosham: { type: Boolean, default: false },
    chevvaiDoshamType: { type: String, enum: ['none', 'mild', 'severe'] },
    nadiType: { type: String, enum: ['aadi', 'madhya', 'antya'] },
    ganamType: { type: String, enum: ['deva', 'manushya', 'rakshasa'] }
  },
  
  // Basic profile (non-sensitive, used for filtering)
  education: String,
  profession: String,
  annualIncome: { type: String, enum: ['below-3L', '3-6L', '6-12L', '12-25L', 'above-25L'] },
  motherTongue: { type: String, enum: ['tamil', 'telugu', 'kannada', 'malayalam'] },
  religion: { type: String, default: 'hindu' },
  caste: String,
  subCaste: String,
  gothram: String,
  height: Number, // in cm
  
  // Age range preference for match
  preferredAgeMin: Number,
  preferredAgeMax: Number,
  
  // Behavioral (filled by candidate in Candidate Portal)
  bigFiveCompleted: { type: Boolean, default: false },
  bigFiveScores: {
    openness: { type: Number, min: 0, max: 100 },
    conscientiousness: { type: Number, min: 0, max: 100 },
    extraversion: { type: Number, min: 0, max: 100 },
    agreeableness: { type: Number, min: 0, max: 100 },
    neuroticism: { type: Number, min: 0, max: 100 }
  },
  
  // Photo
  photoUrl: String, // Cloudinary URL
  photoPublicId: String,
  
  // Visibility
  isActive: { type: Boolean, default: true },
  isProfileComplete: { type: Boolean, default: false },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

// Index for fast matching queries
ProfileSchema.index({ gender: 1, isActive: 1, 'astroData.nakshatra': 1 });
ProfileSchema.index({ gender: 1, isActive: 1, 'astroData.rasi': 1 });
ProfileSchema.index({ communityId: 1, gender: 1, isActive: 1 });

module.exports = mongoose.model('Profile', ProfileSchema);
