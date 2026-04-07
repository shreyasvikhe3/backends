const User = require('../models/User');
const Transaction = require('../models/Transaction');
const MarketPrice = require('../models/MarketPrice');
const Crop = require('../models/Crop');
const Bid = require('../models/Bid');

// @desc    Get all users (pending approval)
// @route   GET /api/karmachari/users
// @access  Private (Karmachari only)
const getAllUsers = async (req, res) => {
  try {
    const { status } = req.query; // 'pending', 'approved', 'all'
    
    let query = { role: { $ne: 'karmachari' } };
    
    if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'approved') {
      query.isApproved = true;
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// @desc    Approve/Reject user
// @route   PUT /api/karmachari/users/:userId
// @access  Private (Karmachari only)
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isApproved, isActive } = req.body;

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isApproved !== undefined) {
      user.isApproved = isApproved;
    }
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    res.json({ 
      message: 'User status updated successfully', 
      user: { ...user.toObject(), password: undefined } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating user status' });
  }
};

// @desc    Get all transactions
// @route   GET /api/karmachari/transactions
// @access  Private (Karmachari only)
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

// @desc    Get reports/statistics
// @route   GET /api/karmachari/reports
// @access  Private (Karmachari only)
const getReports = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'karmachari' } });
    const totalFarmers = await User.countDocuments({ role: 'shetkari' });
    const totalTraders = await User.countDocuments({ role: 'vyapari' });
    const pendingApprovals = await User.countDocuments({ isApproved: false });
    
    const totalCrops = await Crop.countDocuments();
    const availableCrops = await Crop.countDocuments({ status: { $in: ['available', 'bidding'] } });
    const soldCrops = await Crop.countDocuments({ status: 'sold' });
    
    const totalBids = await Bid.countDocuments();
    const pendingBids = await Bid.countDocuments({ status: 'pending' });
    
    const totalTransactions = await Transaction.countDocuments();
    
    // Calculate total transaction value
    const transactionSum = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalTransactionValue = transactionSum.length > 0 ? transactionSum[0].totalValue : 0;

    res.json({
      users: {
        total: totalUsers,
        farmers: totalFarmers,
        traders: totalTraders,
        pendingApprovals
      },
      crops: {
        total: totalCrops,
        available: availableCrops,
        sold: soldCrops
      },
      bids: {
        total: totalBids,
        pending: pendingBids
      },
      transactions: {
        total: totalTransactions,
        totalValue: totalTransactionValue
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching reports' });
  }
};

// @desc    Update market prices
// @route   POST /api/karmachari/market-prices
// @access  Private (Karmachari only)
const updateMarketPrice = async (req, res) => {
  try {
    const { cropName, cropNameMarathi, minPrice, maxPrice, avgPrice, unit } = req.body;

    // Check if price exists
    let marketPrice = await MarketPrice.findOne({ cropName });

    if (marketPrice) {
      // Update existing
      marketPrice.cropNameMarathi = cropNameMarathi;
      marketPrice.minPrice = minPrice;
      marketPrice.maxPrice = maxPrice;
      marketPrice.avgPrice = avgPrice;
      marketPrice.unit = unit;
      marketPrice.lastUpdated = new Date();
      marketPrice.updatedBy = req.user.id;
      await marketPrice.save();
    } else {
      // Create new
      marketPrice = await MarketPrice.create({
        cropName,
        cropNameMarathi,
        minPrice,
        maxPrice,
        avgPrice,
        unit,
        updatedBy: req.user.id
      });
    }

    res.json(marketPrice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating market price' });
  }
};

// @desc    Get all market prices
// @route   GET /api/karmachari/market-prices
// @access  Private (Karmachari only)
const getMarketPrices = async (req, res) => {
  try {
    const prices = await MarketPrice.find().sort({ lastUpdated: -1 });
    res.json(prices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching market prices' });
  }
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  getAllTransactions,
  getReports,
  updateMarketPrice,
  getMarketPrices
};
