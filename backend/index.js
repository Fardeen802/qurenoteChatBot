const express = require('express');
const cors = require('cors');
const PineConeService = require('./services/PineConeService');
const { getMessages, appendMessages, appendKnowledgeBaseMessage, getSystemPrompt } = require('./utils/InMemoryStore');
const ChatService = require('./services/ChatService');
require('dotenv').config();
const twilioRouter=require("./twilio/api.js")

const app = express();
const PORT =  5050;

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://medical-chat-bot.netlify.app'
];

// const corsOptions = {
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// };
const corsOptions = {
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
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
    let inputMessages = [{ role : 'system', content : getSystemPrompt()}];
    const kb = await pineServiceObj.query(message);
    console.log("this is matched query kb -> ", kb);
    if(kb?.length && kb.length>0){
      const kbText = kb.map(d => d.information).join('\n\n');
      inputMessages.push({
        role : 'system',
        content : `Context from knowledge base:\n${kbText}`,
      })
    }
    const sessionHistory = getMessages(sessionId) ?? [];
    inputMessages.push(...sessionHistory);
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





app.use("/api/twilio",twilioRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 