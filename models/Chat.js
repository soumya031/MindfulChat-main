const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    flag: {
        type: String,
        enum: ['anxiety', 'depression', 'neutral', 'stress', 'suicidal', null],
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    sentiment: {
        type: String,
        required: true,
        enum: ['anxiety', 'depression', 'neutral', 'stress', 'suicidal']
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    needs_immediate_help: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Add index for faster queries
chatSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);