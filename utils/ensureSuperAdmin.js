const User = require('../models/User');

const DEFAULT_SUPERADMIN = {
  username: process.env.DEFAULT_SUPERADMIN_USERNAME || 'superadmin',
  email: process.env.DEFAULT_SUPERADMIN_EMAIL || 'superadmin@krushimitra.com',
  password: process.env.DEFAULT_SUPERADMIN_PASSWORD || 'SuperAdmin@123',
  role: 'superadmin',
  fullName: process.env.DEFAULT_SUPERADMIN_NAME || 'Super Administrator',
  phone: process.env.DEFAULT_SUPERADMIN_PHONE || '9999999999',
  address: process.env.DEFAULT_SUPERADMIN_ADDRESS || 'APMC Nandgaon',
  isApproved: true,
  isActive: true
};

const ensureSuperAdmin = async () => {
  const existingAdmin = await User.findOne({
    role: { $in: ['admin', 'superadmin'] }
  }).lean();

  if (existingAdmin) {
    return {
      created: false,
      user: existingAdmin
    };
  }

  const superadmin = await User.create(DEFAULT_SUPERADMIN);

  return {
    created: true,
    user: superadmin
  };
};

module.exports = {
  ensureSuperAdmin,
  DEFAULT_SUPERADMIN
};
