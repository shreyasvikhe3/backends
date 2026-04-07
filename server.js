// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const connectDB = require('./config/db');

// // Load environment variables
// dotenv.config();

// // Connect to MongoDB
// connectDB();

// // Initialize Express app
// const app = express();

// // Middleware

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // CORS configuration
// app.use(
//   cors({
//     credentials: true,
//     origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//     allowedHeaders: ['Content-Type', 'Authorization']
//   })
// );

// // Import routes
// const authRoutes = require('./routes/auth');
// const shetkariRoutes = require('./routes/shetkari');
// const vyapariRoutes = require('./routes/vyapari');
// const karmachariRoutes = require('./routes/karmachari');
// const commonRoutes = require('./routes/common');

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/shetkari', shetkariRoutes);
// app.use('/api/vyapari', vyapariRoutes);
// app.use('/api/karmachari', karmachariRoutes);
// app.use('/api', commonRoutes);

// // Root route
// app.get('/api', (req, res) => {
//   res.json({ 
//     message: 'KrushiMitra APMC Nandgaon API',
//     version: '1.0.0'
//   });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ 
//     message: 'Something went wrong!',
//     error: process.env.NODE_ENV === 'development' ? err.message : undefined
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ message: 'Route not found' });
// });

// // Start server
// const PORT = process.env.PORT || 8001;
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server running on port ${PORT}`);
//   console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
// });
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { ensureSuperAdmin } = require('./utils/ensureSuperAdmin');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [];

const isPrivateHostname = (hostname = '') => {
  if (!hostname) {
    return false;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  if (/^10\./.test(hostname)) {
    return true;
  }

  if (/^192\.168\./.test(hostname)) {
    return true;
  }

  const match172 = hostname.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
};

const isAllowedLanOrigin = (origin) => {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  try {
    const parsed = new URL(origin);
    return isPrivateHostname(parsed.hostname);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isAllowedLanOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Import routes
const authRoutes = require('./routes/auth');
const shetkariRoutes = require('./routes/shetkari');
const vyapariRoutes = require('./routes/vyapari');
const karmachariRoutes = require('./routes/karmachari');
const commonRoutes = require('./routes/common');
const adminRoutes = require('./routes/admin');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shetkari', shetkariRoutes);
app.use('/api/vyapari', vyapariRoutes);
app.use('/api/karmachari', karmachariRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', commonRoutes);

// Root route
app.get('/api', (req, res) => {
  res.json({
    message: 'KrushiMitra APMC Nandgaon API',
    version: '1.0.0',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 8001;

const startServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected successfully');

    const bootstrapResult = await ensureSuperAdmin();

    if (bootstrapResult.created) {
      console.log('Default superadmin created successfully');
      console.log(`Email: ${bootstrapResult.user.email}`);
      console.log('Password: SuperAdmin@123');
    } else {
      console.log('Admin or superadmin already exists, skipping default seed');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
};

startServer();
