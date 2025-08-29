const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Updated to use a standard model name
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction:
    "You are a compassionate and supportive mental health assistant named MindfulChat. Your primary goal is to provide empathetic support for users experiencing mental health concerns.\n\n" +
    "When responding to users:\n" +
    "1. Prioritize empathy and active listening\n" +
    "2. Recognize signs of serious mental health issues like suicidal ideation\n" +
    "3. Always suggest professional help for serious concerns\n" +
    "4. Provide evidence-based coping strategies when appropriate\n" +
    "5. Maintain a warm, supportive tone\n" +
    "6. Never claim to diagnose conditions or replace professional help\n\n" +
    "If a user expresses thoughts of self-harm or suicide, emphasize the importance of immediate professional support and provide Indian suicide prevention helpline resources. For example, you can say: 'If you are in distress, please reach out to the Sneha India Suicide Prevention Helpline at 044-24640050 (available 24/7, confidential, and free), or iCall at 9152987821.' Do not mention any helplines outside India.",
});

const generationConfig = {
  temperature: 0.7, // Lower temperature for more consistent responses
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 1024, // Reduced to standard length
};

// Safety settings to allow mental health discussions while preventing harmful content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

async function geminiChat(userMessage) {
  try {
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
      history: [
        {
          role: "user",
          parts: [{ text: "hello" }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Hello there. Thanks for reaching out.\nHow are you feeling today? I'm here to listen if anything is on your mind, big or small. No pressure at all, but please know this is a safe space to share if you'd like to.",
            },
          ],
        },
      ],
    });
  
    const result = await chatSession.sendMessage(userMessage);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    // Return a friendly error message
    if (error.message.includes('API key')) {
      return "I apologize, but there seems to be an issue with the API configuration. Please contact support.";
    }
    return "I apologize, but I'm having trouble formulating a response. Please know that your feelings are valid and important. If you're in immediate distress, please reach out to a mental health professional or crisis helpline.";
  }
}

module.exports = geminiChat;