const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `BID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    cropId: {
      type: String,
      required: true,
      ref: 'Crop'
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
    bidAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    message: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Bid', bidSchema);
