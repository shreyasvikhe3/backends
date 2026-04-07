const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `CROP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
    cropName: {
      type: String,
      required: true
    },
    cropNameMarathi: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['kg', 'quintal', 'ton'],
      default: 'quintal'
    },
    basePrice: {
      type: Number,
      required: true
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: ['available', 'bidding', 'sold', 'cancelled'],
      default: 'available'
    },
    soldTo: {
      type: String,
      ref: 'User'
    },
    soldPrice: {
      type: Number
    },
    soldDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Crop', cropSchema);
