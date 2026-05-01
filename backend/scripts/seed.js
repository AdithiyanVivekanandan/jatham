const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });
// fallback to backend/.env if necessary
dotenv.config({ path: path.join(__dirname, '../.env') });

const DoshaRule = require('../models/DoshaRule');
const Community = require('../models/Community');
const connectDB = require('../config/db');

const initialDoshas = [
  {
    doshaName: 'chevvai',
    triggerCondition: { marsHouse: [1, 2, 4, 7, 8, 12] },
    severity: 'severe',
    cancellationRules: [
      { condition: 'Mars in own sign (Aries/Scorpio)', cancellationLogic: { sign: ['aries', 'scorpio'] } },
      { condition: 'Mars exalted (Capricorn)', cancellationLogic: { sign: ['capricorn'] } }
    ],
    isActive: true,
    source: 'Standard South Indian Parashara'
  },
  {
    doshaName: 'rajju',
    triggerCondition: { condition: 'Same Rajju Group AND Same Direction' },
    severity: 'severe',
    cancellationRules: [
      { condition: 'Both have Chevvai Dosham', cancellationLogic: { bothHaveChevvai: true } }
    ],
    isActive: true,
    source: 'Standard South Indian Parashara'
  },
  {
    doshaName: 'nadi',
    triggerCondition: { condition: 'Same Nadi Type' },
    severity: 'severe',
    cancellationRules: [
      { condition: 'Both are same Nakshatra', cancellationLogic: { sameNakshatra: true } }
    ],
    isActive: true,
    source: 'Standard South Indian Parashara'
  }
];

const testCommunity = {
  name: 'Test Community',
  inviteCode: 'TEST1234',
  memberCount: 0,
  isActive: true,
  city: 'Chennai',
  state: 'Tamil Nadu'
};

const seedData = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI not found. Skipping seed.');
    process.exit(0);
  }

  await connectDB();

  try {
    // Seed Dosha Rules
    await DoshaRule.deleteMany({});
    await DoshaRule.insertMany(initialDoshas);
    console.log('Dosha rules seeded.');

    // Seed Community
    await Community.deleteMany({ inviteCode: 'TEST1234' });
    await Community.create(testCommunity);
    console.log('Test community seeded.');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
