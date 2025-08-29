const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const Chat = require('../models/Chat');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Helper function to analyze sentiment
async function analyzeSentiment(text) {
    try {
        const response = await axios.post('http://localhost:5001/analyze', { text });
        return response.data;
    } catch (error) {
        console.error('Sentiment analysis error:', error.message);
        return { emotion: 'neutral', confidence: 0, needs_immediate_help: false };
    }
}

// Helper function to get Gemini response
async function getGeminiResponse(userMessage, emotion, confidence) {
    try {

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Customize prompt based on emotion and confidence
        let emotionContext = "";
        if (confidence > 0.8) {
            switch(emotion) {
                case "anxiety":
                    emotionContext = "They are showing strong signs of anxiety. Focus on calming techniques and reassurance.";
                    break;
                case "depression":
                    emotionContext = "They are showing significant signs of depression. Emphasize hope and gentle encouragement.";
                    break;
                case "stress":
                    emotionContext = "They are under considerable stress. Focus on stress management and self-care.";
                    break;
                case "suicidal":
                    emotionContext = "CRITICAL: They are showing concerning signs. Prioritize safety and immediate professional help.";
                    break;
                default:
                    emotionContext = `They are expressing ${emotion}.`;
            }
        }

        const prompt = `You are a compassionate mental health assistant. ${emotionContext}

Patient message: "${userMessage}"

Guidelines:
- Be warm, empathetic, and validating
- Keep responses concise (2-3 sentences)
- For anxiety: suggest grounding techniques
- For depression: focus on small steps and hope
- For stress: recommend specific relaxation methods
- For suicidal thoughts: emphasize immediate help
- Always maintain a supportive, non-judgmental tone
- Include one practical, actionable suggestion
- Mention professional help if needed
- Keep it concise but caring
- If suicidal, provide Indian suicide prevention helpline resources

Response:`;


        const result = await model.generateContent(prompt);
        const response = await result.response;

        return response.text();
    } catch (error) {
        console.error('Gemini API error:', error.message);
        if (error.message.includes('API key')) {
            return "I apologize, but there seems to be an issue with the API configuration. Please contact support.";
        }
        return "I apologize, but I'm having trouble formulating a response. Please know that your feelings are valid and important. If you're in immediate distress, please reach out to a mental health professional or call the Sneha India Suicide Prevention Helpline at 044-24640050 (available 24/7, confidential, and free).";
    }
}

// Chat controller functions
const sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user._id;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // Analyze sentiment
        const sentimentResult = await analyzeSentiment(message);

        
        // Get AI response
        const aiResponse = await getGeminiResponse(
            message, 
            sentimentResult.emotion, 
            sentimentResult.confidence
        );


        // Save to database
        const chat = await Chat.create({
            user: userId,
            message: message,
            response: aiResponse,
            sentiment: sentimentResult.emotion,
            confidence: sentimentResult.confidence,
            needs_immediate_help: sentimentResult.needs_immediate_help
        });

        res.status(200).json({
            message: chat.message,
            response: chat.response,
            sentiment: chat.sentiment,
            confidence: chat.confidence,
            needs_immediate_help: chat.needs_immediate_help,
            timestamp: chat.createdAt
        });

    } catch (error) {
        console.error('Error in sendMessage:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Failed to process message', details: error.message });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const history = await Chat.find({ user: userId })
            .sort({ createdAt: 1 })
            .select('-__v');
        res.status(200).json(history);
    } catch (error) {
        console.error('Error in getChatHistory:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
};

module.exports = { connectDB, sendMessage, getChatHistory };