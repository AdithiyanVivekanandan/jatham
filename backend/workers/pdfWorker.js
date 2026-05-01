const { pdfQueue } = require('../services/queue');
const { generateAstrologerPDF } = require('../services/pdf');
const MatchResult = require('../models/MatchResult');

pdfQueue.process(async (job, done) => {
  try {
    const { matchId } = job.data;
    
    const match = await MatchResult.findById(matchId).populate('profileA').populate('profileB');
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    // Call service to generate PDF
    const pdfPath = await generateAstrologerPDF(matchId, match.profileA, match.profileB, match);
    
    // Can optionally update match record with export timestamp
    match.exportedAt.push(new Date());
    await match.save();

    console.log(`PDF generated successfully for match ${matchId} at ${pdfPath}`);
    done(null, { pdfPath });
  } catch (error) {
    console.error(`Error generating PDF for job ${job.id}:`, error);
    done(error);
  }
});
