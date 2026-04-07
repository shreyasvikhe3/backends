const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { ensureSuperAdmin, DEFAULT_SUPERADMIN } = require('../utils/ensureSuperAdmin');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const DB_NAME = process.env.DB_NAME || 'krushimitra';

    await mongoose.connect(`${MONGO_URL}/${DB_NAME}`);
    console.log('MongoDB connected');

    const result = await ensureSuperAdmin();

    if (result.created) {
      console.log('Superadmin created successfully');
      console.log('Email:', result.user.email);
      console.log(`Password: ${DEFAULT_SUPERADMIN.password}`);
      console.log('Please change the password after first login');
    } else {
      console.log('Admin or superadmin already exists. Seed skipped.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
