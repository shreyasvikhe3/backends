const User = require('../models/User');
const Transaction = require('../models/Transaction');
const MarketPrice = require('../models/MarketPrice');
const Crop = require('../models/Crop');
const Bid = require('../models/Bid');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

const drawTableHeader = (doc, columns, startX, startY, rowHeight) => {
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  doc.save();
  doc.rect(startX, startY, totalWidth, rowHeight).fill('#F3F4F6');
  doc.restore();

  let currentX = startX;
  columns.forEach((column) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#111827')
      .text(column.header, currentX + 4, startY + 7, {
        width: column.width - 8,
        align: column.align || 'left'
      });
    currentX += column.width;
  });
};

const drawTableRow = (doc, columns, row, startX, startY, rowHeight) => {
  let currentX = startX;

  columns.forEach((column) => {
    doc
      .rect(currentX, startY, column.width, rowHeight)
      .strokeColor('#E5E7EB')
      .lineWidth(0.5)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#111827')
      .text(String(row[column.key] ?? ''), currentX + 4, startY + 7, {
        width: column.width - 8,
        align: column.align || 'left'
      });

    currentX += column.width;
  });
};

const renderPdfTable = (doc, title, columns, rows, summaryLines = []) => {
  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const totalColumnWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = usableWidth / totalColumnWidth;
  const scaledColumns = [];
  let usedWidth = 0;
  const rowHeight = 28;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  let currentY = doc.page.margins.top;

  columns.forEach((column, index) => {
    const width = index === columns.length - 1
      ? usableWidth - usedWidth
      : Math.floor(column.width * scale);

    scaledColumns.push({ ...column, width });
    usedWidth += width;
  });

  const addPageHeader = () => {
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#111827')
      .text(title, startX, currentY, { width: usableWidth, align: 'center' });
    currentY += 24;

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#4B5563')
      .text(`Generated: ${new Date().toLocaleString()}`, startX, currentY, {
        width: usableWidth,
        align: 'right'
      });
    currentY += 24;

    drawTableHeader(doc, scaledColumns, startX, currentY, rowHeight);
    currentY += rowHeight;
  };

  addPageHeader();

  rows.forEach((row) => {
    if (currentY + rowHeight > bottomLimit) {
      doc.addPage();
      currentY = doc.page.margins.top;
      addPageHeader();
    }

    drawTableRow(doc, scaledColumns, row, startX, currentY, rowHeight);
    currentY += rowHeight;
  });

  if (summaryLines.length) {
    if (currentY + summaryLines.length * 18 > bottomLimit) {
      doc.addPage();
      currentY = doc.page.margins.top;
    }

    currentY += 12;
    summaryLines.forEach((line) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#111827')
        .text(line, startX, currentY, { width: usableWidth, align: 'right' });
      currentY += 18;
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin/Superadmin)
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $nin: ['admin', 'superadmin'] } });
    const totalFarmers = await User.countDocuments({ role: 'shetkari' });
    const totalTraders = await User.countDocuments({ role: 'vyapari' });
    const totalOfficers = await User.countDocuments({ role: 'karmachari' });
    const pendingApprovals = await User.countDocuments({ isApproved: false });

    const totalCrops = await Crop.countDocuments();
    const availableCrops = await Crop.countDocuments({ status: { $in: ['available', 'bidding'] } });
    const soldCrops = await Crop.countDocuments({ status: 'sold' });

    const totalBids = await Bid.countDocuments();
    const pendingBids = await Bid.countDocuments({ status: 'pending' });
    const acceptedBids = await Bid.countDocuments({ status: 'accepted' });

    const totalTransactions = await Transaction.countDocuments();

    const transactionSum = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalTransactionValue = transactionSum.length > 0 ? transactionSum[0].totalValue : 0;

    const recentUsers = await User.find({ role: { $nin: ['admin', 'superadmin'] } })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        users: {
          total: totalUsers,
          farmers: totalFarmers,
          traders: totalTraders,
          officers: totalOfficers,
          pendingApprovals
        },
        crops: {
          total: totalCrops,
          available: availableCrops,
          sold: soldCrops
        },
        bids: {
          total: totalBids,
          pending: pendingBids,
          accepted: acceptedBids
        },
        transactions: {
          total: totalTransactions,
          totalValue: totalTransactionValue
        }
      },
      recentActivities: {
        recentUsers,
        recentTransactions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private (Admin/Superadmin)
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;

    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'approved') {
      query.isApproved = true;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:userId
// @access  Private (Admin/Superadmin)
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ id: userId }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:userId
// @access  Private (Admin/Superadmin)
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isApproved, isActive, role, fullName, phone, address } = req.body;

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (['admin', 'superadmin'].includes(user.role) && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can modify admin accounts' });
    }

    if (isApproved !== undefined) user.isApproved = isApproved;
    if (isActive !== undefined) user.isActive = isActive;
    if (role) user.role = role;
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    if (address !== undefined) user.address = address;

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: { ...user.toObject(), password: undefined }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:userId
// @access  Private (Superadmin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (['admin', 'superadmin'].includes(user.role) && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can delete admin accounts' });
    }

    await User.deleteOne({ id: userId });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// @desc    Get all crops with filters
// @route   GET /api/admin/crops
// @access  Private (Admin/Superadmin)
const getAllCrops = async (req, res) => {
  try {
    const { status, search } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { cropName: { $regex: search, $options: 'i' } },
        { cropNameMarathi: { $regex: search, $options: 'i' } },
        { farmerName: { $regex: search, $options: 'i' } }
      ];
    }

    const crops = await Crop.find(query).sort({ createdAt: -1 });
    res.json(crops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching crops' });
  }
};

// @desc    Update crop
// @route   PUT /api/admin/crops/:cropId
// @access  Private (Admin/Superadmin)
const updateCrop = async (req, res) => {
  try {
    const { cropId } = req.params;
    const updates = req.body;

    const crop = await Crop.findOne({ id: cropId });
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        crop[key] = updates[key];
      }
    });

    await crop.save();

    res.json({ message: 'Crop updated successfully', crop });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating crop' });
  }
};

// @desc    Delete crop
// @route   DELETE /api/admin/crops/:cropId
// @access  Private (Admin/Superadmin)
const deleteCrop = async (req, res) => {
  try {
    const { cropId } = req.params;

    const crop = await Crop.findOne({ id: cropId });
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    await Crop.deleteOne({ id: cropId });

    res.json({ message: 'Crop deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting crop' });
  }
};

// @desc    Get all bids with filters
// @route   GET /api/admin/bids
// @access  Private (Admin/Superadmin)
const getAllBids = async (req, res) => {
  try {
    const { status, search } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { cropName: { $regex: search, $options: 'i' } },
        { traderName: { $regex: search, $options: 'i' } }
      ];
    }

    const bids = await Bid.find(query).sort({ createdAt: -1 });
    res.json(bids);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching bids' });
  }
};

// @desc    Update bid status
// @route   PUT /api/admin/bids/:bidId
// @access  Private (Admin/Superadmin)
const updateBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { status } = req.body;

    const bid = await Bid.findOne({ id: bidId });
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    bid.status = status;
    await bid.save();

    res.json({ message: 'Bid updated successfully', bid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating bid' });
  }
};

// @desc    Delete bid
// @route   DELETE /api/admin/bids/:bidId
// @access  Private (Admin/Superadmin)
const deleteBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findOne({ id: bidId });
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    await Bid.deleteOne({ id: bidId });

    res.json({ message: 'Bid deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting bid' });
  }
};

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private (Admin/Superadmin)
const getAllTransactions = async (req, res) => {
  try {
    const { search } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { cropName: { $regex: search, $options: 'i' } },
        { farmerName: { $regex: search, $options: 'i' } },
        { traderName: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

// @desc    Get all market prices
// @route   GET /api/admin/market-prices
// @access  Private (Admin/Superadmin)
const getAllMarketPrices = async (req, res) => {
  try {
    const prices = await MarketPrice.find().sort({ lastUpdated: -1 });
    res.json(prices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching market prices' });
  }
};

// @desc    Update market price
// @route   PUT /api/admin/market-prices/:priceId
// @access  Private (Admin/Superadmin)
const updateMarketPrice = async (req, res) => {
  try {
    const { priceId } = req.params;
    const { cropName, cropNameMarathi, minPrice, maxPrice, avgPrice, unit } = req.body;

    const marketPrice = await MarketPrice.findById(priceId);
    if (!marketPrice) {
      return res.status(404).json({ message: 'Market price not found' });
    }

    marketPrice.cropName = cropName || marketPrice.cropName;
    marketPrice.cropNameMarathi = cropNameMarathi || marketPrice.cropNameMarathi;
    marketPrice.minPrice = minPrice !== undefined ? minPrice : marketPrice.minPrice;
    marketPrice.maxPrice = maxPrice !== undefined ? maxPrice : marketPrice.maxPrice;
    marketPrice.avgPrice = avgPrice !== undefined ? avgPrice : marketPrice.avgPrice;
    marketPrice.unit = unit || marketPrice.unit;
    marketPrice.lastUpdated = new Date();
    marketPrice.updatedBy = req.user.id;

    await marketPrice.save();

    res.json({ message: 'Market price updated successfully', marketPrice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating market price' });
  }
};

// @desc    Delete market price
// @route   DELETE /api/admin/market-prices/:priceId
// @access  Private (Admin/Superadmin)
const deleteMarketPrice = async (req, res) => {
  try {
    const { priceId } = req.params;

    const marketPrice = await MarketPrice.findById(priceId);
    if (!marketPrice) {
      return res.status(404).json({ message: 'Market price not found' });
    }

    await MarketPrice.findByIdAndDelete(priceId);

    res.json({ message: 'Market price deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting market price' });
  }
};

// Export to CSV - Users
const exportUsersCSV = async (req, res) => {
  try {
    const users = await User.find({ role: { $nin: ['admin', 'superadmin'] } }).select('-password');
    const fields = ['id', 'username', 'email', 'fullName', 'phone', 'role', 'isApproved', 'isActive', 'createdAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(users);

    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error exporting users to CSV' });
  }
};

// Export to CSV - Crops
const exportCropsCSV = async (req, res) => {
  try {
    const crops = await Crop.find();
    const fields = ['id', 'farmerId', 'farmerName', 'cropName', 'cropNameMarathi', 'quantity', 'unit', 'basePrice', 'status', 'createdAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(crops);

    res.header('Content-Type', 'text/csv');
    res.attachment('crops.csv');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error exporting crops to CSV' });
  }
};

// Export to CSV - Bids
const exportBidsCSV = async (req, res) => {
  try {
    const bids = await Bid.find();
    const fields = ['id', 'cropId', 'traderId', 'traderName', 'bidAmount', 'status', 'createdAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(bids);

    res.header('Content-Type', 'text/csv');
    res.attachment('bids.csv');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error exporting bids to CSV' });
  }
};

// Export to CSV - Transactions
const exportTransactionsCSV = async (req, res) => {
  try {
    const transactions = await Transaction.find();
    const fields = ['id', 'cropId', 'farmerId', 'farmerName', 'traderId', 'traderName', 'cropName', 'quantity', 'unit', 'price', 'totalAmount', 'transactionDate'];
    const parser = new Parser({ fields });
    const csv = parser.parse(transactions);

    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error exporting transactions to CSV' });
  }
};

// Export to CSV - Market Prices
const exportMarketPricesCSV = async (req, res) => {
  try {
    const prices = await MarketPrice.find();
    const fields = ['cropName', 'cropNameMarathi', 'minPrice', 'maxPrice', 'avgPrice', 'unit', 'lastUpdated'];
    const parser = new Parser({ fields });
    const csv = parser.parse(prices);

    res.header('Content-Type', 'text/csv');
    res.attachment('market-prices.csv');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error exporting market prices to CSV' });
  }
};

// Export to PDF - Users
const exportUsersPDF = async (req, res) => {
  try {
    const users = await User.find({ role: { $nin: ['admin', 'superadmin'] } }).select('-password');
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=users.pdf');

    doc.pipe(res);

    const columns = [
      { key: 'fullName', header: 'Name', width: 130 },
      { key: 'username', header: 'Username', width: 90 },
      { key: 'email', header: 'Email', width: 180 },
      { key: 'phone', header: 'Phone', width: 90 },
      { key: 'role', header: 'Role', width: 80 },
      { key: 'status', header: 'Approval', width: 80 },
      { key: 'active', header: 'Active', width: 70 },
      { key: 'registered', header: 'Registered', width: 90 }
    ];

    const rows = users.map((user) => ({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.isApproved ? 'Approved' : 'Pending',
      active: user.isActive ? 'Yes' : 'No',
      registered: new Date(user.createdAt).toLocaleDateString()
    }));

    renderPdfTable(doc, 'KrushiMitra - Users Report', columns, rows, [
      `Total Users: ${users.length}`
    ]);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error exporting users to PDF' });
  }
};

// Export to PDF - Transactions
const exportTransactionsPDF = async (req, res) => {
  try {
    const transactions = await Transaction.find();
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');

    doc.pipe(res);

    let totalValue = 0;

    const columns = [
      { key: 'transactionId', header: 'Transaction ID', width: 120 },
      { key: 'cropName', header: 'Crop', width: 110 },
      { key: 'farmerName', header: 'Farmer', width: 100 },
      { key: 'traderName', header: 'Trader', width: 100 },
      { key: 'quantity', header: 'Quantity', width: 85, align: 'right' },
      { key: 'unitPrice', header: 'Unit Price', width: 90, align: 'right' },
      { key: 'totalAmount', header: 'Total Amount', width: 95, align: 'right' },
      { key: 'date', header: 'Date', width: 90 }
    ];

    const rows = transactions.map((txn) => {
      totalValue += txn.totalAmount;

      return {
        transactionId: txn.id,
        cropName: txn.cropName,
        farmerName: txn.farmerName,
        traderName: txn.traderName,
        quantity: `${txn.quantity} ${txn.unit}`,
        unitPrice: `Rs. ${txn.price.toLocaleString()}`,
        totalAmount: `Rs. ${txn.totalAmount.toLocaleString()}`,
        date: new Date(txn.transactionDate).toLocaleDateString()
      };
    });

    renderPdfTable(doc, 'KrushiMitra - Transactions Report', columns, rows, [
      `Total Transactions: ${transactions.length}`,
      `Total Transaction Value: Rs. ${totalValue.toLocaleString()}`
    ]);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error exporting transactions to PDF' });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllCrops,
  updateCrop,
  deleteCrop,
  getAllBids,
  updateBid,
  deleteBid,
  getAllTransactions,
  getAllMarketPrices,
  updateMarketPrice,
  deleteMarketPrice,
  exportUsersCSV,
  exportCropsCSV,
  exportBidsCSV,
  exportTransactionsCSV,
  exportMarketPricesCSV,
  exportUsersPDF,
  exportTransactionsPDF
};
