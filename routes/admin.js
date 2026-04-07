const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes are protected and require admin or superadmin role
router.use(protect);
router.use(checkRole('admin', 'superadmin'));

// Dashboard
router.get('/dashboard-stats', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', checkRole('superadmin'), deleteUser); // Only superadmin can delete

// Crop management
router.get('/crops', getAllCrops);
router.put('/crops/:cropId', updateCrop);
router.delete('/crops/:cropId', deleteCrop);

// Bid management
router.get('/bids', getAllBids);
router.put('/bids/:bidId', updateBid);
router.delete('/bids/:bidId', deleteBid);

// Transaction management
router.get('/transactions', getAllTransactions);

// Market price management
router.get('/market-prices', getAllMarketPrices);
router.put('/market-prices/:priceId', updateMarketPrice);
router.delete('/market-prices/:priceId', deleteMarketPrice);

// Export routes
router.get('/export/users/csv', exportUsersCSV);
router.get('/export/crops/csv', exportCropsCSV);
router.get('/export/bids/csv', exportBidsCSV);
router.get('/export/transactions/csv', exportTransactionsCSV);
router.get('/export/market-prices/csv', exportMarketPricesCSV);
router.get('/export/users/pdf', exportUsersPDF);
router.get('/export/transactions/pdf', exportTransactionsPDF);

module.exports = router;
