const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// registration logic 
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    // Check if user already exists (by email or username)
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with that email or username already exists"
      });
    }
    // Create user (password hashing is done in the User model pre-save hook)
    const user = await User.create({ username, email, password });
    const token = generateToken(user._id);
    // Remove password from response
    const { password: pw, ...userData } = user._doc ? user._doc : user.toObject();
    res.status(201).json({
      success: true,
      user: userData,
      token
    });
  } catch (err) {
    res.status(500).json({
      message: "Registration failed",
      error: err.message
    });
  }
}

// login logic
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide both email and password"
      });
    }
    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }
    const token = generateToken(user._id);
    const { password: pw, ...userData } = user._doc ? user._doc : user.toObject();
    res.status(200).json({
      success: true,
      user: userData,
      token
    });
  } catch (err) {
    res.status(500).json({
      message: "Login failed",
      error: err.message
    });
  }
}

exports.logout = async (req, res) => {
  // For stateless JWT-based auth, "logout" is handled client-side
  res.status(200).json({
    success: true,
    data: {}
  });
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authorized"
      });
    }
    
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};