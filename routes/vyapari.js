const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../utils/validators');
const {
  getAvailableCrops,
  placeBid,
  getMyBids,
  getPurchaseHistory
} = require('../controllers/vyapariController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes are protected and require vyapari role
router.use(protect);
router.use(checkRole('vyapari'));

// Get available crops
router.get('/crops', getAvailableCrops);

// Place bid
router.post(
  '/bids',
  [
    body('cropId').trim().notEmpty().withMessage('Crop ID is required'),
    body('bidAmount').isNumeric().withMessage('Bid amount must be a number'),
    validate
  ],
  placeBid
);

// Get my bids
router.get('/bids', getMyBids);

// Get purchase history
router.get('/purchases', getPurchaseHistory);

module.exports = router;
