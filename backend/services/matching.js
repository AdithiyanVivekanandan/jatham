const Profile = require('../models/Profile');
const MatchResult = require('../models/MatchResult');
const { computePorutham } = require('../engine/poruthams');

/**
 * Get or compute match between two profiles
 */
const getOrComputeMatch = async (profileA, profileB) => {
  // Sort IDs so profileA is always the smaller ID to prevent duplicate pairs
  let p1 = profileA;
  let p2 = profileB;
  
  if (p1._id.toString() > p2._id.toString()) {
    p1 = profileB;
    p2 = profileA;
  }

  let match = await MatchResult.findOne({ profileA: p1._id, profileB: p2._id });
  
  if (!match) {
    // We compute porutham. By convention groom is first argument.
    // Let's figure out who is groom and who is bride
    let groom, bride;
    if (p1.gender === 'male' && p2.gender === 'female') {
      groom = p1; bride = p2;
    } else if (p2.gender === 'male' && p1.gender === 'female') {
      groom = p2; bride = p1;
    } else {
      // same sex or other, just pass as is
      groom = p1; bride = p2;
    }

    const result = computePorutham(groom, bride);

    match = new MatchResult({
      profileA: p1._id,
      profileB: p2._id,
      poruthams: result.poruthams,
      doshaAnalysis: result.doshaAnalysis,
      passCount: result.passCount,
      conditionalCount: result.conditionalCount,
      failCount: result.failCount,
      hasHardReject: result.hasHardReject,
      overallScore: result.overallScore,
      calculationMethod: groom.astroData.calculationMethod
    });
    
    await match.save();
  }

  return match;
};

/**
 * Fetch matches for a given profile
 */
const getRankedMatches = async (profileId, page = 1, limit = 20) => {
  const profile = await Profile.findById(profileId);
  if (!profile) throw new Error('Profile not found');

  const targetGender = profile.gender === 'male' ? 'female' : 'male';
  
  // Basic filtering criteria
  const query = {
    gender: targetGender,
    isActive: true,
    _id: { $ne: profile._id }
  };

  // If preferences exist, apply them
  if (profile.preferredAgeMin) {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - profile.preferredAgeMin);
    query.dateOfBirth = { $lte: maxDate };
  }
  
  if (profile.preferredAgeMax) {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - profile.preferredAgeMax);
    if (query.dateOfBirth) {
      query.dateOfBirth.$gte = minDate;
    } else {
      query.dateOfBirth = { $gte: minDate };
    }
  }

  // Fetch potentials
  const potentials = await Profile.find(query);

  const matchResults = [];

  for (const p of potentials) {
    try {
      const match = await getOrComputeMatch(profile, p);
      if (!match.hasHardReject) {
        // Return structured data for the feed
        matchResults.push({
          matchId: match._id,
          score: match.overallScore,
          passCount: match.passCount,
          profile: {
            id: p._id,
            name: p.candidateName,
            age: new Date().getFullYear() - p.dateOfBirth.getFullYear(),
            nakshatra: p.astroData.nakshatraName,
            rasi: p.astroData.rasiName,
            photoUrl: p.photoUrl,
            education: p.education,
            profession: p.profession,
            city: p.placeOfBirth
          }
        });
      }
    } catch (err) {
      console.error(`Error computing match for ${profile._id} and ${p._id}:`, err);
    }
  }

  // Sort by score descending
  matchResults.sort((a, b) => b.score - a.score);

  // Pagination
  const startIndex = (page - 1) * limit;
  const paginated = matchResults.slice(startIndex, startIndex + limit);

  return {
    total: matchResults.length,
    page,
    limit,
    matches: paginated
  };
};

module.exports = {
  getOrComputeMatch,
  getRankedMatches
};
