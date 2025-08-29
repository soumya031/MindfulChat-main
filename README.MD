# MindChat: Mental Health Chatbot 

An intelligent, full-stack mental health support chatbot combining BERT-based sentiment analysis (Python) and Google Gemini AI for empathetic, context-aware responses.

---

## Features
- **BERT-based sentiment analysis** for emotional context detection (Python microservice)
- **Google Gemini-2.0-flash** powered responses (via backend integration)
- Detects multiple emotional states (depression, anxiety, stress, etc.)
- Crisis detection and immediate help resources
- Chat history and sentiment tracking (MongoDB)
- Secure user authentication and JWT-based sessions
- **Admin panel** for user and chat management
- Modern, responsive web UI

---

## 🛠 Tech Stack
- **Backend:** Node.js (Express)
- **Frontend:** HTML, CSS, JavaScript
- **AI/ML:**
  - BERT-based sentiment analysis (Python Flask service, HuggingFace Transformers, PyTorch)
  - Google Gemini-2.0-flash (via @google/generative-ai)
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT
- **Security:** dotenv, rate limiting, CORS, input validation

---

## 📁 Project Structure
```
mental_health_chatbot/
├── app.js                  # Main server entry point
├── config/
│   └── db.js               # MongoDB connection
├── controllers/            # Route handlers (chat, user, gemini)
├── middleware/             # Auth/admin JWT middlewares
├── models/                 # Mongoose schemas (User, Chat)
├── public/                 # Frontend (HTML, CSS, JS)
├── routes/                 # Express route definitions
├── sentiment_service/      # Python LSTM sentiment microservice
│   ├── app.py              # Flask API
│   ├── model/              # Model files (tokenizer, vocab, weights)
│   └── requirements.txt    # Python dependencies
├── .env                    # Environment variables (NOT committed)
├── package.json            # Node.js dependencies and scripts
└── README.md
```

---

## ⚡️ Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/soumya031/MindfulChat-main
cd mental_health_chatbot
npm install
```

### 2. Python Sentiment Service Setup
```bash
cd sentiment_service
pip install -r requirements.txt
cd ..
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_gemini_api_key
PORT=your_port_number
...
```

### 4. Run the Application
- **Start backend server:**
  ```bash
  npm run dev
  ```
- **Start sentiment service:**
  ```bash
  npm run sentiment-service
  ```
- Or use the provided PowerShell script:
  ```bash
  npm run start-all
  ```

### 5. Access the App
- Visit [http://localhost:<PORT>] for the chatbot UI
- Admin panel: [http://localhost:<PORT>/admin.html]for admin access

---

## 🔌 API Endpoints (Summary)

### Chat
- `POST /api/chat/message` — Send message to chatbot
- `GET /api/chat/history` — Get user's chat history

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login user

### Admin
- `GET /api/admin/users` — List users
- `PATCH /api/admin/user/:id` — Edit user
- `DELETE /api/admin/user/:id` — Delete user
- `GET /api/admin/chats` — List chats
- ...and more

---

## 🔒 Security & Privacy
- **Sensitive data**: All secrets loaded from `.env` (never committed)
- **JWT authentication** for all user/admin routes
- **Rate limiting** and CORS enabled
- **Input validation** on all endpoints

---

## 🧠 AI/ML Details
- **Sentiment Service:** Python Flask app exposes `/predict` endpoint for BERT-based sentiment analysis using HuggingFace Transformers and PyTorch
- **Gemini Integration:** Google Gemini API used for generating empathetic, context-aware responses

---

## 🆘 Crisis Response
- Detects crisis keywords and provides immediate help resources and helplines

---

## 📄 License
This project is for educational and non-commercial use. Please see LICENSE for details.

---

## 🙏 Acknowledgments
- [Google Gemini](https://ai.google.dev/) for generative AI
- [BERT](https://huggingface.co/transformers/) for BERT-based sentiment analysis
- [MongoDB](https://www.mongodb.com/) for database

---

> **Note:** If you deploy this project, ensure your `.env` and sensitive files are never pushed to public repositories.

The chatbot includes an automated crisis detection system that:
1. Identifies potential crisis situations
2. Provides immediate helpline information
3. Encourages professional help when needed

## Built with ❤️ by SoumyaAI Technologies / Soumyadip 
