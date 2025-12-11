import { GoogleGenAI, Chat, GenerateContentResponse, Type, Part } from "@google/genai";
import { Message, Sender, Attachment } from "../types";

// Initialize the client with the API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a helpful and expert AI assistant named "Elio". 
You are capable of answering general questions, but you have a specific talent for writing, debugging, and explaining Python code.
- Always provide clean, efficient, and PEP-8 compliant Python code if the user asks for code.
- When generating code, wrap it in Markdown code blocks (e.g., \`\`\`python ... \`\`\`).
- If the user asks for an explanation, explain the concepts clearly but concisely.
- Be friendly, professional, and precise.
`;

let chatSession: Chat | null = null;

export const initializeChat = (useThinking: boolean = false) => {
  const modelName = 'gemini-2.5-flash';
  
  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
  };

  if (useThinking) {
    config.thinkingConfig = { thinkingBudget: 4096 }; 
  }

  chatSession = ai.chats.create({
    model: modelName,
    config: config,
  });
};

export const sendMessageStream = async (
  text: string, 
  attachments: Attachment[] = [],
  onChunk: (text: string) => void
): Promise<void> => {
  if (!chatSession) {
    initializeChat();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session.");
  }

  try {
    let messageContent: string | Part[] = text;

    // If there are attachments, construct a multipart message
    if (attachments.length > 0) {
      const parts: Part[] = [];
      
      // Add text part
      if (text) {
        parts.push({ text: text });
      }

      // Add attachment parts
      attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });

      messageContent = parts;
    }

    // Send message (either string or parts array)
    // Note: The SDK types might expect 'message' to be flexible in the implementation even if strict in types
    // We cast to any to ensure the SDK accepts the parts array structure correctly for chat
    const resultStream = await chatSession.sendMessageStream({ message: messageContent as any });

    for await (const chunk of resultStream) {
      const responseChunk = chunk as GenerateContentResponse;
      if (responseChunk.text) {
        onChunk(responseChunk.text);
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const resetChat = () => {
  chatSession = null;
};

export const generateSuggestions = async (): Promise<{icon: string, text: string}[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate 4 short, intriguing, and diverse questions or tasks a user might ask a coding AI assistant. Topics can include Python, Web Development, Data Science, or General Tech. Keep them under 10 words. Return a JSON array with 'icon' (emoji) and 'text' keys.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              icon: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ["icon", "text"],
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Failed to generate suggestions:", error);
    return [
      { icon: "🐍", text: "Write a Python script for web scraping" },
      { icon: "🎨", text: "Explain CSS Grid vs Flexbox" },
      { icon: "🐛", text: "Debug this React useEffect hook" },
      { icon: "📊", text: "Visualize data with Matplotlib" }
    ];
  }
};