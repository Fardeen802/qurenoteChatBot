const express = require('express');
const router = express.Router();
const session = require('express-session');
const { twiml } = require("twilio");
const OpenAi = require("openai");
require('dotenv').config();
const { connectToMongo } = require("../mongo.js");
const chrono = require('chrono-node');
const PineConeService = require('../services/PineConeService');

const openai = new OpenAi({ apiKey: process.env.OPENAI_KEY });

// Middleware
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: true,
}));

// Logging
router.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// Root test route
router.get('/', (req, res) => {
    res.send('Hello from Qurenote Router!');
});

function getFunctionDefinition() {
    return [
        {
            type: "function",
            function: {
                name: "book_appointment",
                description: "Book a new appointment for a patient",
                parameters: {
                    type: "object",
                    properties: {
                        patientName: { type: "string", description: "patient's name" },
                        dob: { type: "string", description: "date of birth" },
                        phone: { type: "string", description: "phone number" },
                        email: { type: "string", description: "email" },
                        providerName: { type: "string", description: "provider name" },
                        reasonForVisit: { type: "string", description: "reason for visit" },
                        time: { type: "string", description: "appointment time" },
                    },
                    required: ["patientName", "dob", "providerName", "reasonForVisit", "time"],
                },
            },
        },
        {
            type: "function",
            function: {
                name: "create_refill",
                description: "Create a medication refill for a patient",
                parameters: {
                    type: "object",
                    properties: {
                        patientName: { type: "string", description: "patient's name" },
                        dob: { type: "string", description: "date of birth" },
                        medicationName: { type: "string", description: "medication name" },
                    },
                    required: ["patientName", "dob", "medicationName"],
                },
            },
        }
    ];
}

async function processBooking(args, name) {
    let functionResult = {};

    if (name === "book_appointment") {
        const { patientName, dob, phone, email, providerName, reasonForVisit, time } = args;
        if (!phone && !email) {
            functionResult.error = "please provide either phone no or email.";
        } else {
            const parsed = chrono.parseDate(time, new Date());
            if (!parsed) {
                functionResult.error = "invalid time.";
            } else {
                try {
                    const { collection } = await connectToMongo();
                    const appointmentData = {
                        patientName,
                        dob,
                        phone,
                        email,
                        providerName,
                        reason: reasonForVisit,
                        createdAt: new Date(),
                        status: "open",
                        action: "appointment",
                        time: parsed,
                    };
                    const result = await collection.insertOne(appointmentData);
                    console.log(result);
                    functionResult.message = `your appointment is booked with reference number ${result.insertedId}`;
                } catch (error) {
                    console.error("Error saving appointment:", error);
                    functionResult.message = "Sorry, error booking appointment.";
                }
            }
        }
    } else if (name === "create_refill") {
        const { patientName, dob, medicationName } = args;
        try {
            const { collection } = await connectToMongo();
            const doc = {
                patientName,
                dob,
                medicationName,
                createdAt: new Date(),
                status: "open",
                action: "refill",
            };
            const result = await collection.insertOne(doc);
            functionResult.message = `Your refill has been created with reference number ${result.insertedId}`;
        } catch (error) {
            functionResult.error = "Could not validate medication, try later.";
        }
    }

    return functionResult;
}

router.post("/incoming-call", (req, res) => {
    const voiceResponse = new twiml.VoiceResponse();

    if (!req.session.messages) {
        req.session.messages = [
            {
                role: "system",
                content: `You are a secure, HIPAA-compliant virtual assistant named **Qurenote Assistant**.

            Your primary responsibilities include:
            • Booking new patient appointments  
            • Creating prescription refills  
            • Creating specialist referrals  
            • Answering patient questions **only if** relevant context is provided in the knowledge base

            ---

            ### 🩺 Appointment Booking Instructions:
            When a user requests an appointment, you must collect all of the following (collect one by one):
            • Patient's name  
            • Date of birth  
            • Phone number or email address (at least one is required)  
            • Provider's name  
            • time when the appointment start
            When capturing "time when the appointment start":
            - If the user gives a full date/time (YYYY-MM-DDThh:mm:ss), use that exactly.
            - Otherwise, record the raw user phrase (e.g. "tomorrow 4 pm") as the 'time' parameter.
            • reason for visit
            • Once you have all details, call function book_appointment.
            • After function runs, confirm slot back to user.

            When creating a refill you must collect (collect one by one):
            • patient's name
            • date of birth
            • medication name 
            Once you have all details, call function create_refill.
            After function runs, confirm back to the user.


            ### 📚 Knowledge Base Queries:
            If a user's query is not related to appointments, refills, or referrals:
            • Check if it matches context from the provided knowledge base  
            • If relevant context exists, answer the question clearly  
            • If no relevant context is found, politely inform the user that you cannot answer the question

            ---

            ### 👋 Greetings and Tone:
            If the user greets you (e.g., "hi", "hello", "hey"), respond warmly.  
            Example:
              "Hello! I'm Qurenote Virtual Assistant. I can help you book appointments, create refills, and generate referrals. How can I assist you today?"

            Always maintain a polite, professional, and helpful tone.
        `,
            },
            {
                role: "assistant",
                content: "Hello! I'm Qurenote Virtual Assistant. How can I assist you today?",
            },
        ];
        voiceResponse.say("Hello! I'm Qurenote Virtual Assistant. I can help you book appointment create refills and referrals. How can I assist you today?");
    }

    voiceResponse.gather({
        input: ["speech"],
        speechTimeout: "auto",
        speechModel: "experimental_conversations",
        enhanced: true,
        action: "/api/twilio/respond",
    });

    res.set("Content-Type", "application/xml");
    res.send(voiceResponse.toString());
});

router.post("/respond", async (req, res) => {
    const voiceInput = req.body.SpeechResult;
    const pineServiceObj = PineConeService;
    let messages = req.session.messages || [];

    const kb = await pineServiceObj.query(voiceInput);
    console.log("this is matched query kb -> ", kb);
    if (kb?.length > 0) {
        const kbText = kb.map(d => d.information).join('\n\n');
        messages.push({ role: 'system', content: `Context from knowledge base:\n${kbText}` });
    }

    messages.push({ role: "user", content: voiceInput });

    const chatResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: getFunctionDefinition(),
        tool_choice: "auto",
    });

    const choice = chatResponse.choices[0].message;
    const voiceResponse = new twiml.VoiceResponse();

    if (choice.tool_calls?.length > 0) {
        const args = JSON.parse(choice.tool_calls[0].function.arguments || "{}");
        const result = await processBooking(args, choice.tool_calls[0].function.name);

        messages.push(choice);
        messages.push({
            role: "tool",
            tool_call_id: choice.tool_calls[0].id,
            content: JSON.stringify(result),
        });

        const finalReply = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
        });

        const assistantReply = finalReply.choices[0].message.content;
        messages.push({ role: "assistant", content: assistantReply });

        req.session.messages = messages;
        voiceResponse.say(assistantReply);
    } else {
        const assistantReply = choice.content;
        messages.push({ role: "assistant", content: assistantReply });
        req.session.messages = messages;
        voiceResponse.say(assistantReply);
    }

    voiceResponse.redirect({ method: "POST" }, "/api/twilio/incoming-call");

    res.set("Content-Type", "application/xml");
    res.send(voiceResponse.toString());
});

module.exports = router;
