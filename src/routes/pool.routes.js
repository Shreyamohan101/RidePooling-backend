const express = require('express');
const router = express.Router();
const poolController = require('../controllers/pool.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/validation');


router.get(
  '/:id',
  authenticate,
  asyncHandler(poolController.getPoolGroup)
);


router.get(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(poolController.listPoolGroups)
);


router.get(
  '/stats/summary',
  authenticate,
  authorize('admin'),
  asyncHandler(poolController.getPoolGroupStats)
);

module.exports = router;