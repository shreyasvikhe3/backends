const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../utils/validators');
const {
  getAllUsers,
  updateUserStatus,
  getAllTransactions,
  getReports,
  updateMarketPrice,
  getMarketPrices
} = require('../controllers/karmachariController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes are protected and require karmachari role
router.use(protect);
router.use(checkRole('karmachari'));

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId', updateUserStatus);

// Transactions
router.get('/transactions', getAllTransactions);

// Reports
router.get('/reports', getReports);

// Market prices
router.get('/market-prices', getMarketPrices);
router.post(
  '/market-prices',
  [
    body('cropName').trim().notEmpty().withMessage('Crop name is required'),
    body('cropNameMarathi').trim().notEmpty().withMessage('Crop name in Marathi is required'),
    body('minPrice').isNumeric().withMessage('Min price must be a number'),
    body('maxPrice').isNumeric().withMessage('Max price must be a number'),
    body('avgPrice').isNumeric().withMessage('Avg price must be a number'),
    validate
  ],
  updateMarketPrice
);

module.exports = router;
