const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ride.controller');
const { authenticate } = require('../middleware/auth');
const { validate, asyncHandler } = require('../middleware/validation');
const {
  createRideRequestValidator,
  getRideRequestValidator,
  cancelRideRequestValidator,
  listRideRequestsValidator
} = require('../validators/ride.validator');


router.post(
  '/',
  authenticate,
  createRideRequestValidator,
  validate,
  asyncHandler(rideController.createRideRequest)
);


router.get(
  '/',
  authenticate,
  listRideRequestsValidator,
  validate,
  asyncHandler(rideController.listRideRequests)
);


router.get(
  '/:id',
  authenticate,
  getRideRequestValidator,
  validate,
  asyncHandler(rideController.getRideRequest)
);


router.post(
  '/:id/cancel',
  authenticate,
  cancelRideRequestValidator,
  validate,
  asyncHandler(rideController.cancelRideRequest)
);

router.post(
  '/estimate-price',
  asyncHandler(rideController.getEstimatedPrice)
);

module.exports = router;