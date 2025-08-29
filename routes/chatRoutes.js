const express = require("express");
const router = express.Router();
const { sendMessage, getChatHistory } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");
const Chat = require("../models/Chat");

// Process a new chat message
router.post("/message", protect, sendMessage);

// Get chat history for authenticated user
router.get("/history", protect, getChatHistory);

// Clear chat history for authenticated user
router.delete("/history", protect, async (req, res) => {
    try {
        const userId = req.user._id;
        await Chat.deleteMany({ user: userId });
        
        res.status(200).json({
            success: true,
            message: "Chat history cleared successfully"
        });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({ 
            success: false,
            error: "Failed to clear chat history"
        });
    }
});

module.exports = router;