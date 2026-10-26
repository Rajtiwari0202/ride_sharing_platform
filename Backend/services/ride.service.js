const rideModel = require('../models/ride.model');
const mapsService = require('./maps.service');
const crypto = require('crypto');

function getOtp(num = 4) {
    const min = Math.pow(10, num - 1);
    const max = Math.pow(10, num);
    return crypto.randomInt(min, max).toString();
}

module.exports.getOtp = getOtp;

module.exports.getFare = async (pickup, destination) => {
    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    const distanceTime = await mapsService.getDistanceTime(pickup, destination);

    const distanceInKm = distanceTime.distance.value / 1000;
    const durationInMinutes = distanceTime.duration.value / 60;

    // Pricing Matrix
    const baseFare = {
        auto: 30,
        car: 50,
        moto: 20
    };

    const perKmRate = {
        auto: 10,
        car: 15,
        moto: 8
    };

    const perMinuteRate = {
        auto: 2,
        car: 3,
        moto: 1.5
    };

    const fare = {
        auto: Math.round(baseFare.auto + (distanceInKm * perKmRate.auto) + (durationInMinutes * perMinuteRate.auto)),
        car: Math.round(baseFare.car + (distanceInKm * perKmRate.car) + (durationInMinutes * perMinuteRate.car)),
        moto: Math.round(baseFare.moto + (distanceInKm * perKmRate.moto) + (durationInMinutes * perMinuteRate.moto))
    };

    return {
        fare,
        distance: distanceTime.distance,
        duration: distanceTime.duration
    };
};

module.exports.createRide = async ({
    user, pickup, destination, vehicleType
}) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw new Error('All fields are required');
    }

    const fareQuotes = await module.exports.getFare(pickup, destination);
    const selectedFare = fareQuotes.fare[vehicleType];

    if (!selectedFare) {
        throw new Error('Invalid vehicle type');
    }

    const [pickupCoords, destinationCoords] = await Promise.all([
        mapsService.getAddressCoordinate(pickup),
        mapsService.getAddressCoordinate(destination)
    ]);

    const otp = getOtp(4);

    const ride = await rideModel.create({
        user,
        pickup,
        destination,
        pickupLocation: {
            type: 'Point',
            coordinates: [pickupCoords.lng, pickupCoords.ltd]
        },
        destinationLocation: {
            type: 'Point',
            coordinates: [destinationCoords.lng, destinationCoords.ltd]
        },
        otp,
        fare: selectedFare,
        distance: fareQuotes.distance.value,
        duration: fareQuotes.duration.value,
        status: 'REQUESTED'
    });

    return ride;
};
