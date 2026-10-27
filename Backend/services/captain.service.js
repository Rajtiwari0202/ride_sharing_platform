const captainModel = require('../models/captain.model');

module.exports.createCaptain = async ({
    firstname, lastname, email, password,
    color, plate, capacity, vehicleType
}) => {
    if (!firstname || !email || !password || !color || !plate || !capacity || !vehicleType) {
        throw new Error('All fields are required');
    }

    const captain = await captainModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        password,
        vehicle: {
            color,
            plate,
            capacity,
            vehicleType
        }
    });

    return captain;
};

module.exports.updateCaptainLocation = async ({ captainId, latitude, longitude }) => {
    if (latitude === undefined || longitude === undefined) {
        throw new Error('Latitude and longitude are required');
    }

    const captain = await captainModel.findByIdAndUpdate(
        captainId,
        {
            location: {
                type: 'Point',
                coordinates: [ longitude, latitude ] // GeoJSON requires [lng, lat]
            }
        },
        { returnDocument: 'after' }
    );

    return captain;
};

module.exports.updateCaptainStatus = async ({ captainId, status }) => {
    if (!status) {
        throw new Error('Status is required');
    }

    const captain = await captainModel.findByIdAndUpdate(
        captainId,
        { status },
        { returnDocument: 'after' }
    );

    return captain;
};

module.exports.getCaptainsInTheRadius = async ({ ltd, lng, radiusInMeters = 5000, vehicleType }) => {
    const query = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [ lng, ltd ]
                },
                $maxDistance: radiusInMeters
            }
        },
        status: 'active'
    };

    if (vehicleType) {
        if (vehicleType === 'moto' || vehicleType === 'motorcycle') {
            query['vehicle.vehicleType'] = { $in: ['moto', 'motorcycle'] };
        } else {
            query['vehicle.vehicleType'] = vehicleType;
        }
    }

    const captains = await captainModel.find(query);
    return captains;
};
