const fetch = require('node-fetch'); // Ensure node-fetch or native fetch in Node 18+

const SYSTEM_PROMPT = `You are an expert Vedic astrology compatibility analyst specializing in the South Indian Thirumana Porutham system. You receive structured JSON from a deterministic rule engine and produce a clear, honest, culturally-appropriate compatibility report.

Rules you must follow:
1. Never use the words "guaranteed", "perfect", "certain", or "safe".
2. Always use probabilistic language: "tendency toward", "risk of", "alignment suggests", "advisory".
3. Structure your report exactly as specified.
4. Keep the report under 800 words.
5. Be culturally respectful but analytically honest.
6. Always mention that this is a decision support tool and independent verification by a qualified astrologer is recommended.
7. If a hard reject exists (Rajju or Nadi Dosham), say so clearly but without catastrophizing.`;

function buildAIPrompt(matchResult, profileA, profileB) {
  return `
Analyze this Thirumana Porutham compatibility result and generate a structured report.

GROOM NAKSHATRA: ${profileA.astroData.nakshatraName} (${profileA.astroData.gana} gana, ${profileA.astroData.yoniAnimal} yoni)
BRIDE NAKSHATRA: ${profileB.astroData.nakshatraName} (${profileB.astroData.gana} gana, ${profileB.astroData.yoniAnimal} yoni)

PORUTHAM RESULTS:
${JSON.stringify(matchResult.poruthams, null, 2)}

DOSHA ANALYSIS:
${JSON.stringify(matchResult.doshaAnalysis, null, 2)}

AGGREGATE: ${matchResult.passCount}/10 pass, ${matchResult.conditionalCount} conditional, ${matchResult.failCount} fail
HARD REJECT: ${matchResult.hasHardReject}
OVERALL SCORE: ${matchResult.overallScore}/100

Generate a report with exactly these sections:
1. Summary (2-3 sentences, overall compatibility assessment)
2. Strengths (bullet list of what works well)
3. Risk Zones (bullet list of areas needing attention)
4. Dosha Assessment (if any doshas, explain and mention samyam if present)
5. Recommendations (3 behavioral/lifestyle suggestions based on the mismatches)
6. For the Astrologer (technical summary — Nakshatra names, Rajju groups, Dosha details — in one paragraph for the family's astrologer to verify)
7. Disclaimer (standard disclaimer about this being a decision support tool)
`;
}

async function generateAIReport(matchResult, profileA, profileB) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY missing. Returning mock AI report.');
    return "This is a mock AI report. Please configure ANTHROPIC_API_KEY to generate a real report.";
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Using a generic known model name if 20250514 is future placeholder
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildAIPrompt(matchResult, profileA, profileB) }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    throw error;
  }
}

module.exports = {
  generateAIReport
};
