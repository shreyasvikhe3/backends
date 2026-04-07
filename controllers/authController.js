const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { generateOTP, sendOTP } = require('../utils/sendOTP');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const formatAuthResponse = (user, message) => {
  const userPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    isApproved: user.isApproved,
    isActive: user.isActive
  };

  return {
    ...userPayload,
    user: userPayload,
    token: generateToken(user.id, user.role),
    ...(message ? { message } : {})
  };
};

const hasAdminAccount = async () => {
  const adminCount = await User.countDocuments({
    role: { $in: ['admin', 'superadmin'] }
  });

  return adminCount > 0;
};

const generateUniqueUsername = async (seedValue) => {
  const baseUsername = (seedValue || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18) || 'user';

  let username = baseUsername;
  let suffix = 1;

  while (await User.exists({ username })) {
    username = `${baseUsername}${suffix}`;
    suffix += 1;
  }

  return username;
};

const verifyGoogleCredential = async (credential) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in is not configured on the server');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload?.sub) {
    throw new Error('Invalid Google account information received');
  }

  if (!payload.email_verified) {
    throw new Error('Google account email is not verified');
  }

  return payload;
};


// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { username, email, password, role, fullName, phone, address } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email and password are required' });
    }

    // Normalize input
    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username.toLowerCase();

    // Check if user exists
    const userExists = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername }
      ]
    });

    if (userExists) {
      return res.status(400).json({
        message: 'User already exists with this email or username'
      });
    }

    // Create user
    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role,
      fullName,
      phone,
      address
    });

    const registrationMessage =
      user.role === 'karmachari'
        ? 'Registration successful'
        : 'Registration successful. Your account is pending approval.';

    res.status(201).json(formatAuthResponse(user, registrationMessage));

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};


// @desc    Login user (Email OR Username)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    let { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({
        message: 'Email/Username and password are required'
      });
    }

    // Normalize input
    email = email?.toLowerCase();
    username = username?.toLowerCase();

    // Find user
    const user = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : [])
      ]
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check active status
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Your account has been deactivated'
      });
    }

    // 🔥 IMPORTANT: Approval check
    if (!user.isApproved) {
      return res.status(403).json({
        message: 'Your account is pending approval'
      });
    }

    if (user.authProvider === 'google' && !user.isPasswordSet) {
      return res.status(400).json({
        message: 'This account uses Google sign-in. Continue with Google or reset your password first.'
      });
    }

    // Password check
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    res.json(formatAuthResponse(user));

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Login or register user with Google
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const {
      credential,
      createIfMissing = false,
      role,
      phone,
      address,
      fullName,
      username
    } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    const payload = await verifyGoogleCredential(credential);
    const email = payload.email.toLowerCase();
    let createdNewUser = false;
    let user = await User.findOne({
      $or: [
        { email },
        { googleId: payload.sub }
      ]
    });

    if (!user && !createIfMissing) {
      return res.status(404).json({
        message: 'No account found for this Google email. Please register with Google first.'
      });
    }

    if (!user) {
      const resolvedRole = role || 'shetkari';
      const resolvedPhone = phone?.trim() || '0000000000';

      if (!resolvedRole) {
        return res.status(400).json({
          message: 'Role is required to create a Google account'
        });
      }

      const resolvedName = (fullName || payload.name || payload.email.split('@')[0]).trim();
      const requestedUsername = username?.trim();
      const resolvedUsername = requestedUsername
        ? await generateUniqueUsername(requestedUsername)
        : await generateUniqueUsername(payload.email.split('@')[0]);

      user = await User.create({
        username: resolvedUsername,
        email,
        password: crypto.randomBytes(24).toString('hex'),
        authProvider: 'google',
        googleId: payload.sub,
        isPasswordSet: false,
        role: resolvedRole,
        fullName: resolvedName,
        phone: resolvedPhone,
        address: address?.trim()
      });
      createdNewUser = true;
    } else {
      let hasChanges = false;

      if (!user.googleId) {
        user.googleId = payload.sub;
        hasChanges = true;
      }

      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        hasChanges = true;
      }

      if (!user.fullName && payload.name) {
        user.fullName = payload.name.trim();
        hasChanges = true;
      }

      if (address && !user.address) {
        user.address = address.trim();
        hasChanges = true;
      }

      if (hasChanges) {
        await user.save();
      }
    }

    if (!user.isActive) {
      return res.status(401).json({
        message: 'Your account has been deactivated'
      });
    }

    if (createdNewUser && !user.isApproved) {
      return res.status(201).json(formatAuthResponse(
        user,
        'Registration successful. Your account is pending approval.'
      ));
    }

    if (!user.isApproved) {
      return res.status(403).json({
        message: 'Your account is pending approval'
      });
    }

    res.json(formatAuthResponse(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Google sign-in failed' });
  }
};

// @desc    Check whether first admin bootstrap is available
// @route   GET /api/auth/bootstrap-status
// @access  Public
const getAdminBootstrapStatus = async (req, res) => {
  try {
    const adminExists = await hasAdminAccount();

    res.json({
      canBootstrapAdmin: !adminExists
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error checking admin bootstrap status' });
  }
};

// @desc    Create the first admin or superadmin account
// @route   POST /api/auth/bootstrap-admin
// @access  Public (one-time only)
const bootstrapAdmin = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      phone,
      address,
      role
    } = req.body;

    if (await hasAdminAccount()) {
      return res.status(403).json({
        message: 'Admin bootstrap is disabled because an admin account already exists'
      });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username.toLowerCase();
    const normalizedRole = role || 'superadmin';

    const userExists = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername }
      ]
    });

    if (userExists) {
      return res.status(400).json({
        message: 'User already exists with this email or username'
      });
    }

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      fullName,
      phone,
      address,
      isApproved: true,
      isActive: true
    });

    res.status(201).json(formatAuthResponse(
      user,
      `Initial ${normalizedRole} account created successfully`
    ));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during admin bootstrap' });
  }
};


// @desc    Forgot password - send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const otp = generateOTP();

    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOTP(user.email, otp);

    res.json({
      message: 'OTP sent to your email',
      email: user.email
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Error sending OTP' });
  }
};


// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: 'Email, OTP and new password are required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired OTP'
      });
    }

    user.password = newPassword;
    user.isPasswordSet = true;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;

    await user.save();

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};


// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};


module.exports = {
  registerUser,
  loginUser,
  getAdminBootstrapStatus,
  bootstrapAdmin,
  googleAuth,
  forgotPassword,
  resetPassword,
  getUserProfile
};
