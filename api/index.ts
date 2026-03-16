import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/api/generate', async (req, res) => {
  try {
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      return res.status(400).json({ error: 'Missing image data or mime type' });
    }

    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Gemini API key is required. Please provide it in the settings.' });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey as string });

    const prompt = `Analyze this design/image. Recreate it as a clean, professional, scalable vector graphic (SVG) that is compatible with vector editing software like CorelDraw and ready for high-quality print.
  
  CRITICAL REQUIREMENTS FOR TABLES AND ALIGNMENT:
  - If the image contains a table, grid, or form, you MUST recreate it with PERFECT geometric precision.
  - The size of the cells (width and height) MUST be exactly the same and accurate to the original image proportions.
  - All horizontal and vertical lines MUST be perfectly straight and aligned. Use exact X/Y coordinates for <line> or <rect> elements to ensure no distortion.
  - Text inside table cells MUST be perfectly aligned (e.g., vertically centered, horizontally padded) and must NOT overflow or overlap with cell borders. Use <text> elements with precise x, y, and text-anchor attributes.
  - Maintain the EXACT aspect ratio and relative proportions of all elements. Do not stretch or distort anything.
  
  CRITICAL REQUIREMENTS FOR TEXT WRAPPING AND Y-COORDINATES (PREVENT OVERLAPPING):
  - DO NOT MISS ANY TEXT. Every single word, number, and character from the original image MUST be present in the SVG.
  - SVG <text> elements do NOT automatically wrap. You MUST manually break long sentences into multiple lines.
  - FATAL ERROR PREVENTION: You MUST calculate the correct 'y' coordinate for EVERY line of text. Do not put all text at the top of the document (e.g., y="0" or y="10").
  - For text inside table cells, the 'y' coordinate MUST be within the boundaries of that specific cell's row. If a row starts at y="200", the text inside it must have y="210", y="225", etc.
  - Use multiple separate <text> elements for each line of wrapped text, each positioned on a new line with an increasing 'y' value (e.g., y="100", y="115", y="130").
  - Ensure long sentences are wrapped to fit EXACTLY within their respective cell widths, just like the original image. Never let text overflow outside its cell.
  - Cell formatting and text inside the cell MUST be formatted, aligned, and fitted exactly as in the uploaded file.
  - Pay special attention to specific column headers (like "Coach Position") and ensure their text is formatted, sized, and positioned exactly as seen in the image.
  
  General Requirements:
  1. Return ONLY valid SVG code.
  2. Do not include any markdown formatting like \`\`\`svg. Just the raw <svg>...</svg> string.
  3. Ensure it uses standard SVG elements like <rect>, <circle>, <path>, <polygon>, <text>, <line>.
  4. Set the viewBox and width/height to high-resolution print dimensions (e.g., 2480x3508 for A4 at 300dpi, or scale the original image dimensions appropriately).
  5. Use appropriate colors and strokes suitable for print (CMYK-like colors represented in RGB/Hex).
  6. If there is text, use standard web-safe fonts (like Arial, Helvetica, sans-serif) and use appropriate font-size and text-anchor attributes for perfect alignment.
  7. Make it look like a professional, clean vector design layout.
  `;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out after 3 minutes. The design might be too complex.")), 3 * 60 * 1000);
    });

    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          temperature: 0.2,
        }
      }),
      timeoutPromise
    ]);

    let svgContent = response.text || "";
    
    // Clean up potential markdown formatting and extract just the SVG
    if (svgContent.includes("<svg")) {
      svgContent = svgContent.substring(svgContent.indexOf("<svg"), svgContent.lastIndexOf("</svg>") + 6);
    } else if (svgContent.includes("\`\`\`svg")) {
      svgContent = svgContent.split("\`\`\`svg")[1].split("\`\`\`")[0].trim();
    } else if (svgContent.includes("\`\`\`")) {
      svgContent = svgContent.split("\`\`\`")[1].split("\`\`\`")[0].trim();
    }

    res.json({ svgContent: svgContent.trim() });
  } catch (error: any) {
    console.error("Error generating SVG:", error);
    
    let errorMessage = error.message || "Failed to generate SVG";
    
    // Try to parse JSON error message from GoogleGenAI
    try {
      if (errorMessage.startsWith('{') && errorMessage.endsWith('}')) {
        const parsedError = JSON.parse(errorMessage);
        if (parsedError.error && parsedError.error.message) {
          errorMessage = parsedError.error.message;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    const isCustomKey = !!req.headers['x-gemini-api-key'];

    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
      if (isCustomKey) {
        errorMessage = "Your Gemini API Key has exceeded its quota. Please check your Google Cloud billing details.";
      } else {
        errorMessage = "The default API key has exceeded its quota. Please provide your own Gemini API Key in the settings (⚙️).";
      }
    } else if (errorMessage.toLowerCase().includes('api key not valid') || errorMessage.includes('API_KEY_INVALID')) {
      errorMessage = "The provided Gemini API Key is invalid. Please check your settings (⚙️).";
    }

    res.status(500).json({ error: errorMessage });
  }
});

export default app;
