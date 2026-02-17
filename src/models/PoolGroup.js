const mongoose = require('mongoose');

const poolGroupSchema = new mongoose.Schema({
  rides: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideRequest',
    required: true
  }],
  driver: {
    name: String,
    phone: String,
    vehicleNumber: String,
    vehicleModel: String
  },
  status: {
    type: String,
    enum: ['forming', 'ready', 'in-progress', 'completed', 'cancelled'],
    default: 'forming',
    index: true
  },
  route: {
    optimizedWaypoints: [{
      rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RideRequest'
      },
      type: {
        type: String,
        enum: ['pickup', 'dropoff']
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number]
      },
      sequence: Number,
      estimatedTime: Date,
      actualTime: Date
    }],
    totalDistance: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0
    }
  },
  capacity: {
    passengers: {
      current: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 4
      }
    },
    luggage: {
      current: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 8
      }
    }
  },
  pricing: {
    basePrice: Number,
    totalPrice: Number,
    pricePerRide: [{
      rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RideRequest'
      },
      price: Number,
      discount: Number
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

poolGroupSchema.index({ status: 1, createdAt: -1 });
poolGroupSchema.index({ 'rides': 1 });

poolGroupSchema.virtual('rideCount').get(function() {
  return this.rides.length;
});

poolGroupSchema.methods.canAccommodate = function(passengers, luggage) {
  const availableSeats = this.capacity.passengers.max - this.capacity.passengers.current;
  const availableLuggage = this.capacity.luggage.max - this.capacity.luggage.current;
  
  return passengers <= availableSeats && luggage <= availableLuggage;
};

poolGroupSchema.methods.addRide = function(rideId, passengers, luggage) {
  if (!this.canAccommodate(passengers, luggage)) {
    throw new Error('Pool capacity exceeded');
  }
  
  this.rides.push(rideId);
  this.capacity.passengers.current += passengers;
  this.capacity.luggage.current += luggage;
  
  return this;
};

poolGroupSchema.methods.removeRide = function(rideId, passengers, luggage) {
  this.rides = this.rides.filter(id => id.toString() !== rideId.toString());
  this.capacity.passengers.current -= passengers;
  this.capacity.luggage.current -= luggage;
  
  return this;
};


poolGroupSchema.statics.findAvailablePools = async function() {
  return this.find({
    status: 'forming',
    'capacity.passengers.current': { $lt: 4 }
  });
};

const PoolGroup = mongoose.model('PoolGroup', poolGroupSchema);

module.exports = PoolGroup;