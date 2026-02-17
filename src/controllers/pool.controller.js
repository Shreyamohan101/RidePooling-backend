const PoolGroup = require('../models/PoolGroup');
const RideRequest = require('../models/RideRequest');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/error');

const getPoolGroup = async (req, res, next) => {
  try {
    const poolGroup = await PoolGroup.findById(req.params.id)
      .populate({
        path: 'rides',
        populate: {
          path: 'user',
          select: 'name phone'
        }
      });

    if (!poolGroup) {
      throw new AppError('Pool group not found', 404);
    }

    const userRides = poolGroup.rides.filter(
      ride => ride.user._id.toString() === req.user._id.toString()
    );

    if (userRides.length === 0 && req.user.role !== 'admin') {
      throw new AppError('Not authorized to access this pool group', 403);
    }

    res.json({
      success: true,
      data: {
        poolGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

const listPoolGroups = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [poolGroups, total] = await Promise.all([
      PoolGroup.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: 'rides',
          populate: {
            path: 'user',
            select: 'name email phone'
          }
        }),
      PoolGroup.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        poolGroups,
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

const getPoolGroupStats = async (req, res, next) => {
  try {
    const stats = await PoolGroup.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRides: { $avg: { $size: '$rides' } },
          totalDistance: { $sum: '$route.totalDistance' }
        }
      }
    ]);

    const totalPools = await PoolGroup.countDocuments();
    const activePools = await PoolGroup.countDocuments({ 
      status: { $in: ['forming', 'ready', 'in-progress'] }
    });

    res.json({
      success: true,
      data: {
        totalPools,
        activePools,
        byStatus: stats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPoolGroup,
  listPoolGroups,
  getPoolGroupStats
};