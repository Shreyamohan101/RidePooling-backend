const { body, param, query } = require('express-validator');

const createRideRequestValidator = [
  body('pickup.coordinates')
    .isArray({ min: 2, max: 2 }).withMessage('Pickup coordinates must be [longitude, latitude]')
    .custom((value) => {
      const [lon, lat] = value;
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        throw new Error('Invalid coordinates');
      }
      return true;
    }),
  
  body('pickup.address')
    .trim()
    .notEmpty().withMessage('Pickup address is required'),
  
  body('dropoff.coordinates')
    .isArray({ min: 2, max: 2 }).withMessage('Dropoff coordinates must be [longitude, latitude]')
    .custom((value) => {
      const [lon, lat] = value;
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        throw new Error('Invalid coordinates');
      }
      return true;
    }),
  
  body('dropoff.address')
    .trim()
    .notEmpty().withMessage('Dropoff address is required'),
  
  body('passengers')
    .isInt({ min: 1, max: 4 }).withMessage('Passengers must be between 1 and 4'),
  
  body('luggage')
    .optional()
    .isInt({ min: 0, max: 8 }).withMessage('Luggage must be between 0 and 8'),
  
  body('scheduledFor')
    .optional()
    .isISO8601().withMessage('Invalid date format for scheduledFor'),
  
  body('preferences.maxDetourTolerance')
    .optional()
    .isFloat({ min: 0, max: 20 }).withMessage('Max detour tolerance must be between 0 and 20 km'),
  
  body('preferences.allowSharing')
    .optional()
    .isBoolean().withMessage('Allow sharing must be a boolean')
];

const getRideRequestValidator = [
  param('id')
    .isMongoId().withMessage('Invalid ride request ID')
];

const cancelRideRequestValidator = [
  param('id')
    .isMongoId().withMessage('Invalid ride request ID'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Cancellation reason cannot exceed 500 characters')
];

const listRideRequestsValidator = [
  query('status')
    .optional()
    .isIn(['pending', 'matched', 'assigned', 'cancelled', 'completed', 'expired'])
    .withMessage('Invalid status'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

module.exports = {
  createRideRequestValidator,
  getRideRequestValidator,
  cancelRideRequestValidator,
  listRideRequestsValidator
};