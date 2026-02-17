const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate, asyncHandler } = require('../middleware/validation');
const { 
  registerValidator, 
  loginValidator, 
  updateProfileValidator 
} = require('../validators/auth.validator');

router.post(
  '/register',
  registerValidator,
  validate,
  asyncHandler(authController.register)
);

router.post(
  '/login',
  loginValidator,
  validate,
  asyncHandler(authController.login)
);

router.get(
  '/profile',
  authenticate,
  asyncHandler(authController.getProfile)
);

router.put(
  '/profile',
  authenticate,
  updateProfileValidator,
  validate,
  asyncHandler(authController.updateProfile)
);


router.post(
  '/change-password',
  authenticate,
  asyncHandler(authController.changePassword)
);

module.exports = router;