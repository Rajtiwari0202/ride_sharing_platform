const userModel = require('../models/user.model'); 
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');

module.exports.registerUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { fullname, email, password } = req.body;
        const firstname = fullname?.firstname;
        const lastname = fullname?.lastname;

        const hashedPassword = await userModel.hashPassword(password);

        const user = await userService.createUser({
            firstname,
            lastname,
            email,
            password: hashedPassword 
        });
        const token = user.generateAuthToken(); 
        return res.status(201).json({ token,user });
        
    } catch (error) {
        next(error);
    }
};
