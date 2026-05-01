// OpenCage Geocoding API

const geocode = async (placeName) => {
  try {
    if (!process.env.OPENCAGE_API_KEY) {
      // Mock for development if no key
      return { latitude: 13.0827, longitude: 80.2707 }; // Chennai
    }

    // Since node 18+, fetch is global
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(placeName)}&key=${process.env.OPENCAGE_API_KEY}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.results && data.results.length > 0) {
      return {
        latitude: data.results[0].geometry.lat,
        longitude: data.results[0].geometry.lng
      };
    }
    throw new Error('Location not found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

module.exports = { geocode };
