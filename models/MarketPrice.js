const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `PRICE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    cropName: {
      type: String,
      required: true
    },
    cropNameMarathi: {
      type: String,
      required: true
    },
    minPrice: {
      type: Number,
      required: true
    },
    maxPrice: {
      type: Number,
      required: true
    },
    avgPrice: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 'quintal'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
