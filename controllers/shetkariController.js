const Crop = require('../models/Crop');
const Bid = require('../models/Bid');
const Transaction = require('../models/Transaction');

// @desc    Add new crop
// @route   POST /api/shetkari/crops
// @access  Private (Shetkari only)
const addCrop = async (req, res) => {
  try {
    const { cropName, cropNameMarathi, quantity, unit, basePrice, description } = req.body;

    const crop = await Crop.create({
      farmerId: req.user.id,
      farmerName: req.user.fullName,
      cropName,
      cropNameMarathi,
      quantity,
      unit,
      basePrice,
      description
    });

    res.status(201).json(crop);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding crop' });
  }
};

// @desc    Get farmer's crops
// @route   GET /api/shetkari/crops
// @access  Private (Shetkari only)
const getMyCrops = async (req, res) => {
  try {
    const crops = await Crop.find({ farmerId: req.user.id }).sort({ createdAt: -1 });
    res.json(crops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching crops' });
  }
};

// @desc    Get bids on farmer's crops
// @route   GET /api/shetkari/bids/:cropId
// @access  Private (Shetkari only)
const getBidsOnCrop = async (req, res) => {
  try {
    const { cropId } = req.params;
    
    // Verify crop belongs to farmer
    const crop = await Crop.findOne({ id: cropId, farmerId: req.user.id });
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    const bids = await Bid.find({ cropId }).sort({ bidAmount: -1, createdAt: -1 });
    res.json(bids);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching bids' });
  }
};

// @desc    Accept/Reject bid
// @route   PUT /api/shetkari/bids/:bidId
// @access  Private (Shetkari only)
const updateBidStatus = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    const bid = await Bid.findOne({ id: bidId });
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Verify crop belongs to farmer
    const crop = await Crop.findOne({ id: bid.cropId, farmerId: req.user.id });
    if (!crop) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (status === 'accepted') {
      // Update bid status
      bid.status = 'accepted';
      await bid.save();

      // Update crop status
      crop.status = 'sold';
      crop.soldTo = bid.traderId;
      crop.soldPrice = bid.bidAmount;
      crop.soldDate = new Date();
      await crop.save();

      // Create transaction
      await Transaction.create({
        cropId: crop.id,
        farmerId: req.user.id,
        farmerName: req.user.fullName,
        traderId: bid.traderId,
        traderName: bid.traderName,
        cropName: crop.cropName,
        quantity: crop.quantity,
        unit: crop.unit,
        price: bid.bidAmount,
        totalAmount: bid.bidAmount * crop.quantity
      });

      // Reject other bids
      await Bid.updateMany(
        { cropId: crop.id, id: { $ne: bidId } },
        { status: 'rejected' }
      );
    } else {
      bid.status = 'rejected';
      await bid.save();
    }

    res.json({ message: `Bid ${status} successfully`, bid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating bid status' });
  }
};

// @desc    Get farmer's transaction history
// @route   GET /api/shetkari/transactions
// @access  Private (Shetkari only)
const getMyTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ farmerId: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

module.exports = {
  addCrop,
  getMyCrops,
  getBidsOnCrop,
  updateBidStatus,
  getMyTransactions
};
