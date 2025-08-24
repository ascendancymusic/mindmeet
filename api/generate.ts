import { GoogleGenerativeAI } from "@google/generative-ai";
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { contents, generationConfig } = req.body;

  if (!contents || !generationConfig) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-1.5" });

    const result = await model.generateContent({ 
      contents,
      generationConfig,
    });

    const response = result.response;
    const responseText = response.text();
    console.log("Response from Gemini API:", responseText);
    res.status(200).send(responseText);
  } catch (error) {
    console.error("Error generating AI response:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
