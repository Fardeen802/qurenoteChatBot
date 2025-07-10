const express = require('express');
const cors = require('cors');
const { connectToMongo } = require('./mongo');
const { OpenAI } = require('openai');
const PineConeService = require('./services/PineConeService');
const { getMessages, appendMessages } = require('./utils/InMemoryStore');
const ChatService = require('./services/ChatService');
require('dotenv').config();

const app = express();
const PORT =  5050;

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://medical-chat-bot.netlify.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// In-memory session message store
const sessionMessages = new Map();

// List of required parameters for a session
const REQUIRED_PARAMS = [
  'patientName',
  'dob',
  'email',
  'phone',
  'doctor',
  'service',
  'time',
  'status',
  'action',
  'chiefComplaint',
];

// Helper to check if all required params are set
function allParamsSet(sessionData) {
  return REQUIRED_PARAMS.every((param) => sessionData[param]);
}

// In-memory session data store
const sessionDataMap = new Map();

app.post('/api/chat', async (req, res) => {
  try {
    const {message, sessionId} = req?.body;
    const pineServiceObj = PineConeService;
    // retrieve context form pinecone
    let inputMessages = getMessages(sessionId);
    const kb = await pineServiceObj.query(message);
    if(kb?.length && kb.length>0){
      inputMessages = [
        ...inputMessages,
        { role: 'system', content: kb.map(d => d.text).join('\n\n') },
        { role : 'user', content : message},
      ]
    }else{
      inputMessages.push({ role : 'user', content : message });
    }
    inputMessages.push({ role : 'user', content : message });
    appendMessages(sessionId, { role : 'user', content : message });
    const chatServiceObj = new ChatService();
    const aiResponse = await chatServiceObj.requestOpenAI(inputMessages, sessionId);
    // const { collection } = await connectToMongo();
    // await collection.insertOne({ sessionId, ...sessionData });
    return res.json({ message : aiResponse });
  } catch (err) {
    console.error("error is -> ", err);
    return res.status(500).json({ error: 'Failed to get response from OpenAI' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 