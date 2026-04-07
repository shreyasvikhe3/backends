const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    cropId: {
      type: String,
      required: true,
      ref: 'Crop'
    },
    farmerId: {
      type: String,
      required: true,
      ref: 'User'
    },
    farmerName: {
      type: String,
      required: true
    },
    traderId: {
      type: String,
      required: true,
      ref: 'User'
    },
    traderName: {
      type: String,
      required: true
    },
    cropName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    transactionDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);
