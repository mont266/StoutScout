
import { GoogleGenAI, Type } from "@google/genai";

// As per guidelines, the API key is sourced directly from process.env.API_KEY.
// It is assumed to be available in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses the Gemini API to get coordinates for a pub.
 * @param {string} name The name of the pub.
 * @param {string} address The address of the pub.
 * @returns {Promise<{lat: number, lng: number}>} The coordinates.
 * @throws {Error} If coordinates cannot be determined or API fails.
 */
export const getCoordinatesForPub = async (name, address) => {
  const prompt = `You are a precise geocoding assistant. Your task is to find the latitude and longitude for a given pub name and address. Respond ONLY with a valid JSON object containing "lat" and "lng" keys. Do not include any other text, explanation, or markdown formatting. Pub Name: "${name}", Address: "${address}".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: {
              type: Type.NUMBER,
              description: 'The latitude of the pub.'
            },
            lng: {
              type: Type.NUMBER,
              description: 'The longitude of the pub.'
            },
          },
          required: ["lat", "lng"]
        },
      },
    });

    const parsed = JSON.parse(response.text);

    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      return parsed;
    } else {
      throw new Error("Could not determine precise coordinates from the response.");
    }
  } catch (error) {
    console.error("Error fetching coordinates from Gemini:", error);
    throw new Error("Failed to find location. Please check the pub name and address, or try again later.");
  }
};
