const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!req.user.isApproved && req.user.role !== 'karmachari') {
      return res.status(403).json({ 
        message: 'Your account is pending approval. Please contact APMC office.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to access this resource' 
      });
    }

    next();
  };
};

module.exports = { checkRole };
