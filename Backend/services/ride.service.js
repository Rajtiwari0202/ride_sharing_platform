const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const mapsService = require('./maps.service');
const dispatchService = require('./dispatch.service');
const { sendToUser } = require('../socket');
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
        vehicleType,
        distance: fareQuotes.distance.value,
        duration: fareQuotes.duration.value,
        status: 'REQUESTED'
    });

    // Populate user details for dispatch context
    const populatedRide = await rideModel.findById(ride._id).populate('user', '-password');

    // Trigger real-time cascading dispatch engine asynchronously
    dispatchService.startCascadingDispatch(populatedRide).catch((err) => {
        console.error('[Dispatch Error]', err.message);
    });

    return ride;
};

module.exports.confirmRide = async ({ rideId, captainId }) => {
    if (!rideId || !captainId) {
        throw new Error('Ride ID and Captain ID are required');
    }
    return await dispatchService.acceptOffer({ rideId, captainId });
};

module.exports.rejectRide = async ({ rideId, captainId }) => {
    if (!rideId || !captainId) {
        throw new Error('Ride ID and Captain ID are required');
    }
    return await dispatchService.rejectOffer({ rideId, captainId });
};

module.exports.startRide = async ({ rideId, otp, captainId }) => {
    if (!rideId || !otp || !captainId) {
        throw new Error('Ride ID, OTP and Captain ID are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captainId
    }).select('+otp').populate('user', '-password').populate('captain', '-password');

    if (!ride) {
        throw new Error('Ride not found or not assigned to you');
    }

    if (ride.status !== 'ACCEPTED') {
        throw new Error(`Cannot start ride in status: ${ride.status}`);
    }

    if (ride.otp !== otp) {
        throw new Error('Invalid OTP');
    }

    const updatedRide = await rideModel.findByIdAndUpdate(
        rideId,
        { status: 'IN_PROGRESS' },
        { returnDocument: 'after' }
    ).populate('user', '-password').populate('captain', '-password');

    sendToUser(updatedRide.user._id, 'ride-started', {
        message: 'Your ride has started',
        ride: updatedRide
    });

    return updatedRide;
};

module.exports.endRide = async ({ rideId, captainId }) => {
    if (!rideId || !captainId) {
        throw new Error('Ride ID and Captain ID are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captainId
    }).populate('user', '-password').populate('captain', '-password');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'IN_PROGRESS') {
        throw new Error(`Cannot end ride in status: ${ride.status}`);
    }

    const updatedRide = await rideModel.findByIdAndUpdate(
        rideId,
        { status: 'COMPLETED' },
        { returnDocument: 'after' }
    ).populate('user', '-password').populate('captain', '-password');

    // Free captain back to active state for new rides
    await captainModel.findByIdAndUpdate(captainId, { status: 'active' });

    sendToUser(updatedRide.user._id, 'ride-ended', {
        message: 'Your ride has completed successfully',
        ride: updatedRide
    });

    return updatedRide;
};
