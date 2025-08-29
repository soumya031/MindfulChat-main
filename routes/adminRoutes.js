const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

// Apply both middleware to all admin routes
router.use(protect, isAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Admin user fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { username, email, isAdmin } = req.body;
    
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, isAdmin },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Delete user's chats
    await Chat.deleteMany({ user: req.params.id });
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Admin user delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get all chats (with pagination)
router.get('/chats', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    const chats = await Chat.find()
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Chat.countDocuments();
    
    res.status(200).json({
      success: true,
      count: chats.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: chats
    });
  } catch (error) {
    console.error('Admin chats fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get chat by ID
router.get('/chats/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).populate('user', 'username email');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Admin chat detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Update chat (for flagging or sentiment updates)
router.put('/chats/:id', async (req, res) => {
  try {
    let { flag, sentiment } = req.body;
    const allowedFlags = ['anxiety', 'depression', 'neutral', 'stress', 'suicidal', null];
    if (flag === '') flag = null;
    if (flag && !allowedFlags.includes(flag)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid flag value'
      });
    }
    if (sentiment && !allowedFlags.includes(sentiment)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sentiment value'
      });
    }
    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      { flag, sentiment },
      { new: true, runValidators: true }
    ).populate('user', 'username email');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Admin chat update error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Delete chat
router.delete('/chats/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }
    
    await Chat.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Admin chat delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get analytics/statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalChats = await Chat.countDocuments();
    
    // Get new users in last 7 days
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const newUsers = await User.countDocuments({ createdAt: { $gte: lastWeek } });
    
    // Get new chats in last 7 days
    const newChats = await Chat.countDocuments({ createdAt: { $gte: lastWeek } });
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalChats,
        newUsers,
        newChats
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;