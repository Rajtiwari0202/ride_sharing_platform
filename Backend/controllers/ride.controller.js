const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');

module.exports.createRide = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { pickup, destination, vehicleType } = req.body;

        const ride = await rideService.createRide({
            user: req.user._id,
            pickup,
            destination,
            vehicleType
        });

        return res.status(201).json(ride);
    } catch (error) {
        next(error);
    }
};

module.exports.getFare = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { pickup, destination } = req.query;

        const fareDetails = await rideService.getFare(pickup, destination);

        return res.status(200).json(fareDetails);
    } catch (error) {
        next(error);
    }
};

module.exports.confirmRide = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { rideId } = req.body;

        const ride = await rideService.confirmRide({
            rideId,
            captainId: req.captain._id
        });

        return res.status(200).json(ride);
    } catch (error) {
        next(error);
    }
};

module.exports.rejectRide = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { rideId } = req.body;

        const result = await rideService.rejectRide({
            rideId,
            captainId: req.captain._id
        });

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

module.exports.startRide = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { rideId, otp } = req.body;

        const ride = await rideService.startRide({
            rideId,
            otp,
            captainId: req.captain._id
        });

        return res.status(200).json(ride);
    } catch (error) {
        next(error);
    }
};

module.exports.endRide = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { rideId } = req.body;

        const ride = await rideService.endRide({
            rideId,
            captainId: req.captain._id
        });

        return res.status(200).json(ride);
    } catch (error) {
        next(error);
    }
};
