const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const blackListTokenModel = require('../models/blacklistToken.model');
const { validationResult } = require('express-validator');

module.exports.registerCaptain = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { fullname, email, password, vehicle } = req.body;

        const isCaptainAlreadyExist = await captainModel.findOne({ email });
        if (isCaptainAlreadyExist) {
            return res.status(400).json({ message: 'Captain already exists' });
        }

        const hashedPassword = await captainModel.hashPassword(password);

        const captain = await captainService.createCaptain({
            firstname: fullname.firstname,
            lastname: fullname.lastname,
            email,
            password: hashedPassword,
            color: vehicle.color,
            plate: vehicle.plate,
            capacity: vehicle.capacity,
            vehicleType: vehicle.vehicleType
        });

        const token = captain.generateAuthToken();

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.cookie('captain_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        const captainObj = captain.toObject();
        delete captainObj.password;

        return res.status(201).json({ token, captain: captainObj });
    } catch (error) {
        next(error);
    }
};

module.exports.loginCaptain = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const captain = await captainModel.findOne({ email }).select('+password');
        if (!captain) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await captain.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = captain.generateAuthToken();

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.cookie('captain_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        const captainObj = captain.toObject();
        delete captainObj.password;

        return res.status(200).json({ token, captain: captainObj });
    } catch (error) {
        next(error);
    }
};

module.exports.getCaptainProfile = async (req, res, next) => {
    try {
        return res.status(200).json({ captain: req.captain });
    } catch (error) {
        next(error);
    }
};

module.exports.logoutCaptain = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

        if (token) {
            await blackListTokenModel.create({ token });
        }

        res.clearCookie('token');
        res.clearCookie('captain_token');

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports.updateCaptainLocation = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { latitude, longitude } = req.body;

        const updatedCaptain = await captainService.updateCaptainLocation({
            captainId: req.captain._id,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
        });

        return res.status(200).json({
            message: 'Location updated successfully',
            location: updatedCaptain.location
        });
    } catch (error) {
        next(error);
    }
};

module.exports.updateCaptainStatus = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { status } = req.body;

        const updatedCaptain = await captainService.updateCaptainStatus({
            captainId: req.captain._id,
            status
        });

        return res.status(200).json({
            message: 'Status updated successfully',
            status: updatedCaptain.status
        });
    } catch (error) {
        next(error);
    }
};

module.exports.getNearbyCaptains = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { latitude, longitude, radius, vehicleType } = req.query;

        const captains = await captainService.getCaptainsInTheRadius({
            ltd: parseFloat(latitude),
            lng: parseFloat(longitude),
            radiusInMeters: radius ? parseFloat(radius) : 5000,
            vehicleType
        });

        return res.status(200).json({
            count: captains.length,
            captains
        });
    } catch (error) {
        next(error);
    }
};
