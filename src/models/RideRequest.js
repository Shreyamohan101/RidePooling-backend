const mongoose = require('mongoose');
const locationSchema = require('./schemas/Location');

const rideRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pickup: {
    type: locationSchema,
    required: [true, 'Pickup location is required']
  },
  dropoff: {
    type: locationSchema,
    required: [true, 'Dropoff location is required']
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  passengers: {
    type: Number,
    required: [true, 'Number of passengers is required'],
    min: [1, 'At least 1 passenger required'],
    max: [4, 'Maximum 4 passengers allowed']
  },
  luggage: {
    type: Number,
    default: 0,
    min: [0, 'Luggage count cannot be negative'],
    max: [8, 'Maximum 8 luggage items allowed']
  },
  preferences: {
    maxDetourTolerance: {
      type: Number,
      default: 5,
      min: 0,
      max: 20
    },
    allowSharing: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'matched', 'assigned', 'cancelled', 'completed', 'expired'],
    default: 'pending'
  },
  poolGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PoolGroup',
    default: null
  },
  estimatedPrice: {
    type: Number,
    default: 0
  },
  finalPrice: {
    type: Number,
    default: null
  },
  distance: {
    type: Number,
    default: 0
  },
  estimatedDuration: {
    type: Number,
    default: 0
  },
  cancellationReason: {
    type: String,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

rideRequestSchema.index({ status: 1, requestedAt: -1 });
rideRequestSchema.index({ user: 1, status: 1 });
rideRequestSchema.index({ 'pickup.coordinates': '2dsphere' });
rideRequestSchema.index({ 'dropoff.coordinates': '2dsphere' });
rideRequestSchema.index({ poolGroup: 1 });

rideRequestSchema.index({ requestedAt: 1 }, { expireAfterSeconds: 86400 });

rideRequestSchema.virtual('duration').get(function() {
  if (this.updatedAt && this.requestedAt) {
    return Math.floor((this.updatedAt - this.requestedAt) / 1000 / 60); 
  }
  return 0;
});

rideRequestSchema.methods.isValid = function() {
  if (this.status === 'cancelled' || this.status === 'completed' || this.status === 'expired') {
    return false;
  }
  
  const now = new Date();
  const expiryTime = new Date(this.requestedAt.getTime() + 30 * 60 * 1000); 
  
  return now < expiryTime;
};

rideRequestSchema.statics.findNearbyPending = async function(coordinates, maxDistance = 10000) {
  return this.find({
    status: 'pending',
    'pickup.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    }
  });
};

const RideRequest = mongoose.model('RideRequest', rideRequestSchema);

module.exports = RideRequest;