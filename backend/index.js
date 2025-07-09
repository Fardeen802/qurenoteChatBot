const express = require('express');
const cors = require('cors');
const { connectToMongo } = require('./mongo');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Missing message or sessionId' });
  }

  // Get or initialize session messages and data
  let messages = sessionMessages.get(sessionId) || [
    { role: 'system', content: 'You are a helpful assistant.' }
  ];
  let sessionData = sessionDataMap.get(sessionId) || {};
  messages.push({ role: 'user', content: message });

  // Function calling for each parameter
  const functions = REQUIRED_PARAMS.map((param) => ({
    name: `set_${param}`,
    description: `Set the value for ${param}`,
    parameters: {
      type: 'object',
      properties: {
        value: { type: 'string', description: `Value for ${param}` },
      },
      required: ['value'],
    },
  }));

  try {
    // Call OpenAI with function calling
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages,
      functions,
      function_call: 'auto',
    });

    const responseMessage = completion.choices[0].message;

    // If function call is requested
    if (responseMessage.function_call) {
      const { name, arguments: args } = responseMessage.function_call;
      const paramMatch = name.match(/^set_(.+)$/);
      let functionResponse;
      if (paramMatch && REQUIRED_PARAMS.includes(paramMatch[1])) {
        const param = paramMatch[1];
        let value;
        try {
          value = JSON.parse(args).value;
        } catch (e) {
          value = args.value || args;
        }
        sessionData[param] = value;
        functionResponse = { success: true, param, value };
      } else {
        functionResponse = { error: 'Unknown function' };
      }
      messages.push(responseMessage);
      messages.push({
        role: 'function',
        name: responseMessage.function_call.name,
        content: JSON.stringify(functionResponse),
      });
      // Call OpenAI again with function response
      const secondCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages,
      });
      const finalMessage = secondCompletion.choices[0].message;
      messages.push(finalMessage);
      sessionMessages.set(sessionId, messages);
      sessionDataMap.set(sessionId, sessionData);
      // Only store in MongoDB if all params are set
      if (allParamsSet(sessionData)) {
        const { collection } = await connectToMongo();
        await collection.insertOne({ sessionId, ...sessionData });
      }
      return res.json({ response: finalMessage.content, sessionData });
    } else {
      messages.push(responseMessage);
      sessionMessages.set(sessionId, messages);
      sessionDataMap.set(sessionId, sessionData);
      // Only store in MongoDB if all params are set
      if (allParamsSet(sessionData)) {
        const { collection } = await connectToMongo();
        await collection.insertOne({ sessionId, ...sessionData });
      }
      return res.json({ response: responseMessage.content, sessionData });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get response from OpenAI' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 