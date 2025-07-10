const { appendMessages } = require("../utils/InMemoryStore");
const OpenAiUtils = require("../utils/OpenAiUtils");
const { connectToMongo } = require("../mongo");
const chrono = require('chrono-node');

class ChatService {
  async requestOpenAI(inputMessages, sessionId) {
    const openai = OpenAiUtils.getOpenAiInstance();
    const firstResponse = await openai.responses.create({
      model: "gpt-4o-mini",
      input: inputMessages,
      tools: this.#getFunctionCalls(),
      tool_choice: "auto",
    });
    const choice = firstResponse?.output[0];
    if (choice?.type === "function_call") {
      console.log("insided function call");
      let functionResult = {};
      const { name } = choice;
      const args = JSON.parse(choice.arguments);
      if (name === "book_appointment") {
        console.log("inside book_appointment function", name, args);
        const {
          patientName,
          dob,
          phone,
          email,
          providerName,
          reasonForVisit,
          time,
        } = args;
        if (!phone && !email) {
          functionResult.error = "please provide either phone no or email.";
        } else {
          const parsed = chrono.parseDate(time, new Date());
          if (!parsed) {
            functionResult.error = "invalid time.";
          } else {
            // All parameters received, save to MongoDB
            try {
              const { collection } = await connectToMongo();
              const appointmentData = {
                patientName,
                dob,
                phone,
                email,
                providerName,
                reasonForVisit,
                createdAt: new Date(),
                status: "open",
                action: "appointment",
              };
              appointmentData.time = parsed;
              console.log("parsed date -> ", parsed);

              const result = await collection.insertOne(appointmentData);
              const referenceNumber = result.insertedId.toString();

              functionResult.message = `your appointment is booked with reference number ${referenceNumber}`;
              console.log(
                "Appointment saved to MongoDB with ID:",
                result.insertedId
              );
            } catch (error) {
              console.error("Error saving appointment to MongoDB:", error);
              functionResult.message =
                "Sorry, there was an error booking your appointment. Please try again.";
            }
          }
        }
        console.log("details -> ", args);
      }
      console.log("what comes in function result -> ", functionResult);
      inputMessages.push(choice);
      inputMessages.push({
        type: "function_call_output",
        call_id: choice.call_id,
        output: JSON.stringify(functionResult),
      });
      const secondResponse = await openai.responses.create({
        model: "gpt-4o-mini",
        input: inputMessages,
        tools: this.#getFunctionCalls(),
        store: true,
      });
      console.log("second response -> ", secondResponse);
      if (secondResponse?.output_text) {
        appendMessages(sessionId, {
          role: "assistant",
          content: secondResponse.output_text,
        });
      }
      return secondResponse.output_text;
    } else if (firstResponse?.output_text) {
      console.log("response from output text -> ", firstResponse);
      if (firstResponse?.output_text) {
        appendMessages(sessionId, {
          role: "assistant",
          content: firstResponse.output_text,
        });
      }
      return firstResponse.output_text;
    }
  }
  #getFunctionCalls() {
    const Functions = [
      {
        type: "function",
        name: "book_appointment",
        description: "Book a new appointment for a patient",
        parameters: {
          type: "object",
          properties: {
            patientName: {
              type: "string",
              description:
                "patient's name for which appointment should be booked, must be collected from user's input.",
            },
            dob: {
              type: "string",
              description:
                "date of birth of patient must be collected from user's input.",
            },
            phone: {
              type: "string",
              description:
                "patient's phone no, either this or email must be collected from user's input.",
            },
            email: {
              type: "string",
              description:
                "patient's email, either this or phone no must be collected from user's input.",
            },
            providerName: {
              type: "string",
              description:
                "provider's name to which appointment should be booked, must be collected from user's input.",
            },
            reasonForVisit: {
              type: "string",
              description:
                "reason for visit, must be collected from user's input.",
            },
            time: {
              type: "string",
              description:
                "Exact time the user says — if it's relative (e.g. “tomorrow 4 pm”) preserve as-is.",
            },
          },
          required: [
            "patientName",
            "dob",
            "providerName",
            "reasonForVisit",
            "time",
          ],
        },
      },
    ];
    return Functions;
  }

  

  //   #getSystemPrompt() {
  //     const prompt = `
  // You are a medical assistant.
  // Your job is to:
  // - detect whether patient is advised for follow up.
  // - if yes, capture 'when' (valid date format if possible; otherwise free-text).
  // - capture 'to' indicating where or to whom the follow up is advised: 'self' for same provider, or the name/role of someone else.
  // `;
  //     return prompt;
  //   }
}

module.exports = ChatService
