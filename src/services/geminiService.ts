export async function generateSvgFromImage(base64Image: string, mimeType: string, apiKey?: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['x-gemini-api-key'] = apiKey;
  }

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ base64Image, mimeType }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate SVG');
  }

  const data = await response.json();
  return data.svgContent;
}
