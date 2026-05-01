let swisseph;
try {
  swisseph = require('swisseph');
} catch (err) {
  console.warn('swisseph not installed, using mock');
  swisseph = {
    swe_julday: () => 2451545.0,
    SE_GREG_CAL: 1,
    swe_set_sid_mode: () => {},
    SE_SIDM_LAHIRI: 1,
    SEFLG_SPEED: 256,
    SEFLG_SIDEREAL: 64,
    SE_SUN: 0, SE_MOON: 1, SE_MARS: 4, SE_MERCURY: 2, SE_JUPITER: 5, SE_VENUS: 3, SE_SATURN: 6, SE_TRUE_NODE: 11,
    swe_calc_ut: (julday, body, flags) => ({ longitude: Math.random() * 360 }),
    swe_houses: () => ({ ascendant: Math.random() * 360 })
  };
}
const { NAKSHATRAS, RASI_NAMES } = require('./constants');
const { detectChevvaiDosham, applyVakyamOffset } = require('./doshas');

async function calculateBirthChart(dob, timeString, latitude, longitude, mode = 'thirukkanitha') {
  // Parse date and time
  const [hour, minute] = timeString.split(':').map(Number);
  const date = new Date(dob);
  
  // Julian Day Number
  const julday = swisseph.swe_julday(
    date.getFullYear(), date.getMonth() + 1, date.getDate(),
    hour + minute / 60,
    swisseph.SE_GREG_CAL
  );

  // Set sidereal mode (Lahiri ayanamsa — standard for South India)
  swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

  const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SIDEREAL;

  // Calculate planet positions
  const planets = {};
  const planetList = [
    { id: swisseph.SE_SUN, name: 'sun' },
    { id: swisseph.SE_MOON, name: 'moon' },
    { id: swisseph.SE_MARS, name: 'mars' },
    { id: swisseph.SE_MERCURY, name: 'mercury' },
    { id: swisseph.SE_JUPITER, name: 'jupiter' },
    { id: swisseph.SE_VENUS, name: 'venus' },
    { id: swisseph.SE_SATURN, name: 'saturn' },
    { id: swisseph.SE_TRUE_NODE, name: 'rahu' }
  ];

  for (const planet of planetList) {
    const result = swisseph.swe_calc_ut(julday, planet.id, flags);
    planets[planet.name] = {
      longitude: result.longitude,
      sign: Math.floor(result.longitude / 30) + 1, // 1-12
      degree: result.longitude % 30
    };
  }
  
  // Ketu is always opposite Rahu
  planets.ketu = {
    longitude: (planets.rahu.longitude + 180) % 360,
    sign: ((planets.rahu.sign - 1 + 6) % 12) + 1
  };

  // Apply Vakyam offset if needed
  if (mode === 'vakyam') {
    for (const p of Object.keys(planets)) {
      planets[p].longitude = applyVakyamOffset(planets[p].longitude);
      planets[p].sign = Math.floor(planets[p].longitude / 30) + 1;
    }
  }

  // Moon Nakshatra (each nakshatra = 13°20' = 13.333...)
  const moonLong = planets.moon.longitude;
  const nakshatraIndex = Math.floor(moonLong / (360 / 27)) + 1; // 1-27
  const pada = Math.floor((moonLong % (360 / 27)) / (360 / 27 / 4)) + 1; // 1-4
  const rasi = planets.moon.sign;

  // Lagna (Ascendant)
  const houseResult = swisseph.swe_houses(julday, latitude, longitude, 'P'); // Placidus
  const lagna = Math.floor(houseResult.ascendant / 30) + 1;

  // Compute house positions for each planet
  for (const p of Object.keys(planets)) {
    planets[p].house = ((Math.floor(planets[p].longitude / 30) - Math.floor(houseResult.ascendant / 30) + 12) % 12) + 1;
  }

  const chevvai = detectChevvaiDosham(planets);

  return {
    nakshatra: nakshatraIndex,
    nakshatraName: NAKSHATRAS[nakshatraIndex - 1].name,
    pada,
    rasi,
    rasiName: RASI_NAMES[rasi - 1],
    lagna,
    lagnaName: RASI_NAMES[lagna - 1],
    moonDegree: moonLong,
    planets,
    gana: NAKSHATRAS[nakshatraIndex - 1].gana,
    yoniAnimal: NAKSHATRAS[nakshatraIndex - 1].yoni,
    yoniGender: NAKSHATRAS[nakshatraIndex - 1].yoniGender,
    rajjuGroup: NAKSHATRAS[nakshatraIndex - 1].rajju,
    rajjuDirection: NAKSHATRAS[nakshatraIndex - 1].rajjuDir,
    planetLord: NAKSHATRAS[nakshatraIndex - 1].lord,
    nadiType: NAKSHATRAS[nakshatraIndex - 1].nadi,
    chevvaiDosham: chevvai.hasDosha,
    chevvaiDoshamType: chevvai.type,
    calculationMethod: mode
  };
}

module.exports = {
  calculateBirthChart
};
