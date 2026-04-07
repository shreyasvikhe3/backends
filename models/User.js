const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    googleId: {
      type: String,
      default: null
    },
    isPasswordSet: {
      type: Boolean,
      default: true
    },
    role: {
      type: String,
      enum: ['shetkari', 'vyapari', 'karmachari','admin','superadmin'],
      required: true
    },
    fullName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String
    },
    isApproved: {
      type: Boolean,
      default: function() {
        return ['karmachari', 'admin', 'superadmin'].includes(this.role) ? true : false;
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    resetOTP: {
      type: String
    },
    resetOTPExpires: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
