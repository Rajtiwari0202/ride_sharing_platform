const axios = require('axios');

/**
 * Calculates great-circle distance between two GPS coordinates using the Haversine formula.
 * Applies a 1.25x road tortuosity factor to approximate actual driving distance.
 */
function calculateHaversineDistanceTime(origCoord, destCoord) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRad(destCoord.ltd - origCoord.ltd);
    const dLon = toRad(destCoord.lng - origCoord.lng);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(origCoord.ltd)) * Math.cos(toRad(destCoord.ltd)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistanceKm = R * c;

    // Real-world road distance is ~25% longer than straight-line distance
    const roadDistanceKm = Math.max(straightDistanceKm * 1.25, 0.5);
    const distanceInMeters = Math.round(roadDistanceKm * 1000);

    // Assume average city driving speed of 25 km/h
    const averageSpeedKmh = 25;
    const durationInHours = roadDistanceKm / averageSpeedKmh;
    const durationInSeconds = Math.round(durationInHours * 3600);

    return {
        distance: {
            text: `${roadDistanceKm.toFixed(1)} km`,
            value: distanceInMeters
        },
        duration: {
            text: `${Math.round(durationInSeconds / 60)} mins`,
            value: durationInSeconds
        }
    };
}

module.exports.getAddressCoordinate = async (address) => {
    if (!address) {
        throw new Error('Address is required');
    }

    // 1. Direct coordinate format support: "28.6139, 77.2090"
    const coordMatch = address.toString().match(/^([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)$/);
    if (coordMatch) {
        return {
            ltd: parseFloat(coordMatch[1]),
            lng: parseFloat(coordMatch[2])
        };
    }

    // 2. Google Maps Geocoding if API key is provided
    const apiKey = process.env.GOOGLE_MAPS_API;
    if (apiKey) {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
            const response = await axios.get(url, { timeout: 4000 });
            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const location = response.data.results[0].geometry.location;
                return {
                    ltd: location.lat,
                    lng: location.lng
                };
            }
        } catch (error) {
            console.warn('Google Maps Geocoding API failed, falling back to OSM:', error.message);
        }
    }

    // 3. Fallback: Free OpenStreetMap Nominatim Geocoding
    try {
        const osmUrl = `https://nominatim.openstreetmap.org/search`;
        const response = await axios.get(osmUrl, {
            params: { q: address, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'RideSharingPlatform/1.0' },
            timeout: 4000
        });

        if (response.data && response.data.length > 0) {
            return {
                ltd: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            };
        }
    } catch (error) {
        console.warn('OSM Nominatim Geocoding failed:', error.message);
    }

    // Default fallback coordinates (Connaught Place, New Delhi center) for mock testing
    return {
        ltd: 28.6315,
        lng: 77.2167
    };
};

module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    // 1. Google Maps Distance Matrix if API key is provided
    const apiKey = process.env.GOOGLE_MAPS_API;
    if (apiKey) {
        try {
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
            const response = await axios.get(url, { timeout: 4000 });
            if (response.data.status === 'OK') {
                const element = response.data.rows[0]?.elements[0];
                if (element && element.status === 'OK') {
                    return {
                        distance: element.distance,
                        duration: element.duration
                    };
                }
            }
        } catch (error) {
            console.warn('Google Maps Distance Matrix failed, falling back to Haversine:', error.message);
        }
    }

    // 2. Graceful Degradation: Haversine distance calculation
    const [origCoord, destCoord] = await Promise.all([
        module.exports.getAddressCoordinate(origin),
        module.exports.getAddressCoordinate(destination)
    ]);

    return calculateHaversineDistanceTime(origCoord, destCoord);
};

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('Input query is required');
    }

    const apiKey = process.env.GOOGLE_MAPS_API;
    if (apiKey) {
        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
            const response = await axios.get(url, { timeout: 4000 });
            if (response.data.status === 'OK') {
                return response.data.predictions.map((prediction) => prediction.description);
            }
        } catch (error) {
            console.warn('Google Places Autocomplete failed, falling back:', error.message);
        }
    }

    // Fallback: OpenStreetMap Nominatim
    try {
        const osmUrl = `https://nominatim.openstreetmap.org/search`;
        const response = await axios.get(osmUrl, {
            params: { q: input, format: 'json', limit: 5 },
            headers: { 'User-Agent': 'RideSharingPlatform/1.0' },
            timeout: 4000
        });

        if (response.data) {
            return response.data.map((item) => item.display_name);
        }
    } catch (error) {
        console.warn('OSM Autocomplete failed:', error.message);
    }

    return [];
};
