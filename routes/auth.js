const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../utils/validators');
const {
  registerUser,
  loginUser,
  getAdminBootstrapStatus,
  bootstrapAdmin,
  googleAuth,
  forgotPassword,
  resetPassword,
  getUserProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Register
router.post(
  '/register',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['shetkari', 'vyapari', 'karmachari']).withMessage('Invalid role'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    validate
  ],
  registerUser
);

// Login
router.post(
  '/login',
  [
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.username) {
        throw new Error('Email or username is required');
      }
      return true;
    }),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  loginUser
);

router.post(
  '/google',
  [
    body('credential').trim().notEmpty().withMessage('Google credential is required'),
    body('createIfMissing').optional().isBoolean().withMessage('createIfMissing must be true or false'),
    body('role').optional().isIn(['shetkari', 'vyapari', 'karmachari']).withMessage('Invalid role'),
    body('phone').optional().trim().notEmpty().withMessage('Phone is required when provided'),
    validate
  ],
  googleAuth
);

router.get('/bootstrap-status', getAdminBootstrapStatus);

router.post(
  '/bootstrap-admin',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'superadmin']).withMessage('Role must be admin or superadmin'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    validate
  ],
  bootstrapAdmin
);

// Forgot Password
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    validate
  ],
  forgotPassword
);

// Reset Password
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
  ],
  resetPassword
);

// Get Profile
router.get('/profile', protect, getUserProfile);

module.exports = router;
