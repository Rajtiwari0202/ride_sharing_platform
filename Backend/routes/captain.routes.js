const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const captainController = require('../controllers/captain.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/register', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('vehicle.color').isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
    body('vehicle.plate').isLength({ min: 3 }).withMessage('Plate must be at least 3 characters long'),
    body('vehicle.capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('vehicle.vehicleType').isIn([ 'car', 'motorcycle', 'auto' ]).withMessage('Invalid vehicle type')
], captainController.registerCaptain);

router.post('/login', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], captainController.loginCaptain);

router.get('/profile', authMiddleware.authCaptain, captainController.getCaptainProfile);

router.get('/logout', authMiddleware.authCaptain, captainController.logoutCaptain);

router.patch('/location', [
    authMiddleware.authCaptain,
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude (-90 to 90)'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude (-180 to 180)')
], captainController.updateCaptainLocation);

router.patch('/status', [
    authMiddleware.authCaptain,
    body('status').isIn([ 'active', 'inactive' ]).withMessage('Status must be active or inactive')
], captainController.updateCaptainStatus);

// Rider or Captain discovering nearby available captains
router.get('/nearby', [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude (-90 to 90)'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude (-180 to 180)'),
    query('radius').optional().isFloat({ min: 100 }).withMessage('Radius must be at least 100 meters')
], captainController.getNearbyCaptains);

module.exports = router;
