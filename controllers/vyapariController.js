const Crop = require('../models/Crop');
const Bid = require('../models/Bid');
const Transaction = require('../models/Transaction');

// @desc    Get all available crops
// @route   GET /api/vyapari/crops
// @access  Private (Vyapari only)
const getAvailableCrops = async (req, res) => {
  try {
    const crops = await Crop.find({ 
      status: { $in: ['available', 'bidding'] } 
    }).sort({ createdAt: -1 });
    res.json(crops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching crops' });
  }
};

// @desc    Place bid on crop
// @route   POST /api/vyapari/bids
// @access  Private (Vyapari only)
const placeBid = async (req, res) => {
  try {
    const { cropId, bidAmount, message } = req.body;

    // Check if crop exists and is available
    const crop = await Crop.findOne({ id: cropId });
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    if (crop.status === 'sold') {
      return res.status(400).json({ message: 'Crop already sold' });
    }

    // Check if bid amount is valid
    if (bidAmount < crop.basePrice) {
      return res.status(400).json({ 
        message: `Bid amount must be at least ${crop.basePrice}` 
      });
    }

    // Check if trader already placed a bid
    const existingBid = await Bid.findOne({ 
      cropId, 
      traderId: req.user.id,
      status: 'pending'
    });

    if (existingBid) {
      return res.status(400).json({ 
        message: 'You have already placed a bid on this crop' 
      });
    }

    // Create bid
    const bid = await Bid.create({
      cropId,
      traderId: req.user.id,
      traderName: req.user.fullName,
      bidAmount,
      message
    });

    // Update crop status to bidding
    if (crop.status === 'available') {
      crop.status = 'bidding';
      await crop.save();
    }

    res.status(201).json(bid);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error placing bid' });
  }
};

// @desc    Get trader's bids
// @route   GET /api/vyapari/bids
// @access  Private (Vyapari only)
const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ traderId: req.user.id }).sort({ createdAt: -1 });
    
    // Populate crop details
    const bidsWithCrops = await Promise.all(
      bids.map(async (bid) => {
        const crop = await Crop.findOne({ id: bid.cropId });
        return {
          ...bid.toObject(),
          crop
        };
      })
    );

    res.json(bidsWithCrops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching bids' });
  }
};

// @desc    Get trader's purchase history
// @route   GET /api/vyapari/purchases
// @access  Private (Vyapari only)
const getPurchaseHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ traderId: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching purchase history' });
  }
};

module.exports = {
  getAvailableCrops,
  placeBid,
  getMyBids,
  getPurchaseHistory
};
