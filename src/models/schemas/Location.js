const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 2 && 
               v[0] >= -180 && v[0] <= 180 && 
               v[1] >= -90 && v[1] <= 90;      
      },
      message: 'Invalid coordinates. Format: [longitude, latitude]'
    }
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  airport: {
    type: String,
    trim: true
  },
  terminal: {
    type: String,
    trim: true
  }
}, { _id: false });

locationSchema.index({ coordinates: '2dsphere' });

module.exports = locationSchema;