import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  riskLevel: "Low" | "Medium" | "High";
  score: number; // 0 to 100
  findings: string[];
  recommendation: string;
  isDeepfake?: boolean;
}

export async function analyzeText(text: string): Promise<AnalysisResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following message for potential scam indicators. 
    Look for:
    - Sense of urgency or pressure
    - Emotional manipulation (fear, greed, sympathy)
    - Requests for money, gift cards, or personal info
    - Suspicious links or unusual contact methods
    - Unrealistic promises (job offers, prizes)
    
    Message: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          score: { type: Type.NUMBER, description: "Risk score from 0 to 100" },
          findings: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendation: { type: Type.STRING },
        },
        required: ["riskLevel", "score", "findings", "recommendation"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Failed to analyze text");
  }
}

export async function analyzeAudio(base64Audio: string, mimeType: string): Promise<AnalysisResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType,
          },
        },
        {
          text: `Analyze this audio snippet for potential scam indicators or signs of being a deepfake.
          Look for:
          - Synthetic voice artifacts (unnatural pauses, robotic tone, inconsistent breathing)
          - Deceptive intent (urgency, emotional pressure, requests for money)
          - Background noise inconsistencies
          
          Provide a risk assessment.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          score: { type: Type.NUMBER, description: "Risk score from 0 to 100" },
          findings: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendation: { type: Type.STRING },
          isDeepfake: { type: Type.BOOLEAN, description: "Whether the audio appears to be AI-generated" },
        },
        required: ["riskLevel", "score", "findings", "recommendation", "isDeepfake"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Failed to analyze audio");
  }
}
