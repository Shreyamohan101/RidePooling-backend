const { body } = require('express-validator');

const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('role')
    .optional()
    .isIn(['passenger', 'admin']).withMessage('Invalid role')
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
  
  body('preferences.maxDetourTolerance')
    .optional()
    .isFloat({ min: 0, max: 20 }).withMessage('Max detour tolerance must be between 0 and 20 km'),
  
  body('preferences.allowSharing')
    .optional()
    .isBoolean().withMessage('Allow sharing must be a boolean')
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator
};