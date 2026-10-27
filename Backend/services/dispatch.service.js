const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const captainService = require('./captain.service');
const { sendToUser, sendToCaptain } = require('../socket');

// In-memory active dispatch sessions: Map<rideIdString, session>
const activeDispatches = new Map();

function dispatchToCandidate(session) {
    if (session.currentIndex >= session.candidates.length) {
        console.log(`[Dispatch] All candidate captains exhausted for ride ${session.rideId}`);
        sendToUser(session.ride.user._id || session.ride.user, 'no-captains-found', {
            rideId: session.rideId,
            message: 'All nearby captains were busy or did not respond. Please try again shortly.'
        });
        activeDispatches.delete(session.rideId);
        return;
    }

    const currentCaptain = session.candidates[session.currentIndex];
    console.log(`[Dispatch] Offering ride ${session.rideId} to Captain ${currentCaptain._id} (${currentCaptain.fullname.firstname}), attempt ${session.currentIndex + 1} of ${session.candidates.length}`);

    // Send real-time offer event to this specific captain
    sendToCaptain(currentCaptain._id, 'new-ride-offer', {
        rideId: session.rideId,
        pickup: session.ride.pickup,
        destination: session.ride.destination,
        fare: session.ride.fare,
        distance: session.ride.distance,
        duration: session.ride.duration,
        timeoutSeconds: session.timeoutSeconds
    });

    // Start the countdown timer (15 seconds)
    session.timer = setTimeout(async () => {
        console.log(`[Dispatch] 15s window expired for Captain ${currentCaptain._id} on ride ${session.rideId}. Cascading...`);
        sendToCaptain(currentCaptain._id, 'offer-expired', { rideId: session.rideId });

        session.currentIndex += 1;
        dispatchToCandidate(session);
    }, session.timeoutSeconds * 1000);
}

module.exports.startCascadingDispatch = async (ride) => {
    const pickupCoords = ride.pickupLocation?.coordinates || [0, 0]; // [lng, lat]
    const lng = pickupCoords[0];
    const ltd = pickupCoords[1];

    // Find available active captains within 5km matching vehicle type
    const nearbyCaptains = await captainService.getCaptainsInTheRadius({
        ltd,
        lng,
        radiusInMeters: 5000,
        vehicleType: ride.vehicleType
    });

    const rideIdStr = ride._id.toString();

    if (!nearbyCaptains || nearbyCaptains.length === 0) {
        console.log(`[Dispatch] No active captains within 5km for ride ${rideIdStr}`);
        sendToUser(ride.user._id || ride.user, 'no-captains-found', {
            rideId: rideIdStr,
            message: 'No available captains found in your pickup area.'
        });
        return { dispatched: false, candidateCount: 0 };
    }

    const session = {
        rideId: rideIdStr,
        ride,
        candidates: nearbyCaptains,
        currentIndex: 0,
        timer: null,
        timeoutSeconds: 15
    };

    activeDispatches.set(rideIdStr, session);
    dispatchToCandidate(session);

    return {
        dispatched: true,
        candidateCount: nearbyCaptains.length
    };
};

module.exports.acceptOffer = async ({ rideId, captainId }) => {
    const rideIdStr = rideId.toString();
    const session = activeDispatches.get(rideIdStr);

    if (session) {
        if (session.timer) {
            clearTimeout(session.timer);
        }
        activeDispatches.delete(rideIdStr);
    }

    // Atomic update ensures only one captain acquires the ride
    const ride = await rideModel.findOneAndUpdate(
        { _id: rideId, status: 'REQUESTED' },
        { status: 'ACCEPTED', captain: captainId },
        { returnDocument: 'after' }
    ).select('+otp').populate('user', '-password').populate('captain', '-password');

    if (!ride) {
        throw new Error('Ride not found or already accepted by another captain');
    }

    // Update captain operational status to on_ride
    await captainModel.findByIdAndUpdate(captainId, { status: 'on_ride' });

    // Send driver copy WITHOUT the OTP (Captain must never see passenger's OTP beforehand)
    const captainRide = ride.toObject();
    delete captainRide.otp;

    // Notify Captain
    sendToCaptain(captainId, 'ride-confirmed', {
        message: 'Ride accepted successfully',
        ride: captainRide
    });

    // Notify Rider with Captain and vehicle details AND the OTP
    sendToUser(ride.user._id, 'ride-accepted', {
        message: 'Captain assigned to your ride',
        ride,
        captain: ride.captain
    });

    return captainRide;
};

module.exports.rejectOffer = async ({ rideId, captainId }) => {
    const rideIdStr = rideId.toString();
    const session = activeDispatches.get(rideIdStr);

    if (session) {
        const currentCaptain = session.candidates[session.currentIndex];
        if (currentCaptain && currentCaptain._id.toString() === captainId.toString()) {
            if (session.timer) {
                clearTimeout(session.timer);
            }
            console.log(`[Dispatch] Captain ${captainId} explicitly declined ride ${rideIdStr}. Cascading immediately...`);
            sendToCaptain(captainId, 'offer-cancelled', { rideId: rideIdStr });

            session.currentIndex += 1;
            dispatchToCandidate(session);
            return { message: 'Offer declined. Cascaded to next captain.' };
        }
    }

    return { message: 'No active offer for this captain on this ride' };
};
