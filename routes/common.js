const express = require('express');
const router = express.Router();
const MarketPrice = require('../models/MarketPrice');

// @desc    Get market prices (public/authenticated)
// @route   GET /api/market-prices
// @access  Public
router.get('/market-prices', async (req, res) => {
  try {
    const prices = await MarketPrice.find().sort({ lastUpdated: -1 });
    res.json(prices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching market prices' });
  }
});

module.exports = router;
