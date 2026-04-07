const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../utils/validators');
const {
  addCrop,
  getMyCrops,
  getBidsOnCrop,
  updateBidStatus,
  getMyTransactions
} = require('../controllers/shetkariController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes are protected and require shetkari role
router.use(protect);
router.use(checkRole('shetkari'));

// Add crop
router.post(
  '/crops',
  [
    body('cropName').trim().notEmpty().withMessage('Crop name is required'),
    body('cropNameMarathi').trim().notEmpty().withMessage('Crop name in Marathi is required'),
    body('quantity').isNumeric().withMessage('Quantity must be a number'),
    body('basePrice').isNumeric().withMessage('Base price must be a number'),
    validate
  ],
  addCrop
);

// Get my crops
router.get('/crops', getMyCrops);

// Get bids on specific crop
router.get('/bids/:cropId', getBidsOnCrop);

// Accept/Reject bid
router.put(
  '/bids/:bidId',
  [
    body('status').isIn(['accepted', 'rejected']).withMessage('Invalid status'),
    validate
  ],
  updateBidStatus
);

// Get transaction history
router.get('/transactions', getMyTransactions);


module.exports = router;
