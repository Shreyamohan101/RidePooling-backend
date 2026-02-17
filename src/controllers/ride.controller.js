const RideRequest = require('../models/RideRequest');
const PoolGroup = require('../models/PoolGroup');
const matchingService = require('../services/matchingService');
const pricingService = require('../services/pricingService');
const { calculateDistance } = require('../utils/geo');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/error');


const createRideRequest = async (req, res, next) => {
  try {
    const { pickup, dropoff, passengers, luggage, scheduledFor, preferences } = req.body;

    const distance = calculateDistance(pickup.coordinates, dropoff.coordinates);

    const rideRequest = await RideRequest.create({
      user: req.user._id,
      pickup: {
        type: 'Point',
        coordinates: pickup.coordinates,
        address: pickup.address,
        city: pickup.city,
        airport: pickup.airport,
        terminal: pickup.terminal
      },
      dropoff: {
        type: 'Point',
        coordinates: dropoff.coordinates,
        address: dropoff.address,
        city: dropoff.city,
        airport: dropoff.airport,
        terminal: dropoff.terminal
      },
      passengers,
      luggage: luggage || 0,
      scheduledFor,
      distance,
      preferences: {
        maxDetourTolerance: preferences?.maxDetourTolerance || req.user.preferences?.maxDetourTolerance || 5,
        allowSharing: preferences?.allowSharing !== undefined ? preferences.allowSharing : 
                      (req.user.preferences?.allowSharing !== undefined ? req.user.preferences.allowSharing : true)
      }
    });

    const estimatedPrice = await pricingService.calculateRideRequestPrice(rideRequest);
    rideRequest.estimatedPrice = estimatedPrice;
    await rideRequest.save();

    let poolGroup = null;
    if (rideRequest.preferences.allowSharing) {
      try {
        const compatibleRides = await matchingService.findCompatibleRides(rideRequest);
        
        if (compatibleRides.length > 0) {
          const ridesToPool = [rideRequest, compatibleRides[0]];
          poolGroup = await matchingService.createOrFindPoolGroup(ridesToPool);
          
          await matchingService.optimizeRoute(poolGroup);
        
          const rides = await RideRequest.find({ _id: { $in: poolGroup.rides } });
          const pricing = await pricingService.calculatePoolGroupPricing(poolGroup, rides);
          
          poolGroup.pricing = pricing;
          await poolGroup.save();
          
          const ridePrice = pricing.pricePerRide.find(
            p => p.rideId.toString() === rideRequest._id.toString()
          );
          
          if (ridePrice) {
            rideRequest.finalPrice = ridePrice.price;
            await rideRequest.save();
          }

          logger.info(`Ride request ${rideRequest._id} matched with pool ${poolGroup._id}`);
        }
      } catch (matchError) {
        logger.error('Error matching rides:', matchError);
       
      }
    }

    const populatedRide = await RideRequest.findById(rideRequest._id)
      .populate('user', 'name email phone')
      .populate('poolGroup');

    logger.info(`Ride request created: ${rideRequest._id}`);

    res.status(201).json({
      success: true,
      message: poolGroup ? 'Ride request created and matched' : 'Ride request created',
      data: {
        rideRequest: populatedRide,
        poolGroup
      }
    });
  } catch (error) {
    next(error);
  }
};


const getRideRequest = async (req, res, next) => {
  try {
    const rideRequest = await RideRequest.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('poolGroup');

    if (!rideRequest) {
      throw new AppError('Ride request not found', 404);
    }

    if (rideRequest.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized to access this ride request', 403);
    }

    res.json({
      success: true,
      data: {
        rideRequest
      }
    });
  } catch (error) {
    next(error);
  }
};

const listRideRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { user: req.user._id };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rideRequests, total] = await Promise.all([
      RideRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('poolGroup'),
      RideRequest.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        rideRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const cancelRideRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rideRequest = await RideRequest.findById(id);

    if (!rideRequest) {
      throw new AppError('Ride request not found', 404);
    }

    // Check authorization
    if (rideRequest.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized to cancel this ride request', 403);
    }

    if (['completed', 'cancelled'].includes(rideRequest.status)) {
      throw new AppError(`Cannot cancel ride with status: ${rideRequest.status}`, 400);
    }

    if (rideRequest.poolGroup) {
      const poolGroup = await PoolGroup.findById(rideRequest.poolGroup);
      
      if (poolGroup) {
      
        poolGroup.removeRide(
          rideRequest._id,
          rideRequest.passengers,
          rideRequest.luggage
        );

        if (poolGroup.rides.length === 0) {
          poolGroup.status = 'cancelled';
        } else if (poolGroup.rides.length === 1) {
         
          await RideRequest.findByIdAndUpdate(poolGroup.rides[0], {
            status: 'pending',
            poolGroup: null
          });
          poolGroup.status = 'cancelled';
        } else {
          await matchingService.optimizeRoute(poolGroup);
          const rides = await RideRequest.find({ _id: { $in: poolGroup.rides } });
          const pricing = await pricingService.calculatePoolGroupPricing(poolGroup, rides);
          poolGroup.pricing = pricing;
        }

        await poolGroup.save();
      }
    }

    rideRequest.status = 'cancelled';
    rideRequest.cancellationReason = reason;
    rideRequest.cancelledAt = new Date();
    rideRequest.poolGroup = null;
    await rideRequest.save();

    logger.info(`Ride request cancelled: ${rideRequest._id}`);

    res.json({
      success: true,
      message: 'Ride request cancelled successfully',
      data: {
        rideRequest
      }
    });
  } catch (error) {
    next(error);
  }
};

const getEstimatedPrice = async (req, res, next) => {
  try {
    const { pickup, dropoff, passengers, allowSharing } = req.body;

    // Calculate distance
    const distance = calculateDistance(pickup.coordinates, dropoff.coordinates);

    // Calculate price
    const price = pricingService.calculateRidePrice(distance, passengers, allowSharing);

    res.json({
      success: true,
      data: {
        distance,
        estimatedPrice: price,
        currency: 'USD'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRideRequest,
  getRideRequest,
  listRideRequests,
  cancelRideRequest,
  getEstimatedPrice
};