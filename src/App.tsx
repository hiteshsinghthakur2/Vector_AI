import React, { useState, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { Editor } from './components/Editor';
import { generateSvgFromImage } from './services/geminiService';
import { PenTool, Settings, X } from 'lucide-react';

export default function App() {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setIsSettingsOpen(false);
  };

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Data = reader.result as string;
        // Extract base64 part
        const base64 = base64Data.split(',')[1];
        
        try {
          const svg = await generateSvgFromImage(base64, file.type, apiKey);
          console.log("Generated SVG:", svg);
          setSvgContent(svg);
        } catch (err: any) {
          console.error("Error generating SVG:", err);
          setError(err.message || "Failed to process the design. Please try again.");
          if (err.message && err.message.toLowerCase().includes('api key')) {
            setIsSettingsOpen(true);
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError("Failed to read the file.");
        setIsLoading(false);
      };
    } catch (err) {
      console.error("Error handling upload:", err);
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <PenTool className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Vectorize AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 hidden sm:block">
              Convert designs to editable vectors
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                Gemini API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Your API key is stored locally in your browser. Get one from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                <strong>Note:</strong> Logging in with Google does not automatically grant API access. You must generate an API key.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveApiKey(apiKey)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {!svgContent ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
                AI-Powered Vectorization
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Upload any image or PDF design. Our AI will analyze it and recreate it as a clean, professional, and editable vector graphic compatible with CorelDraw.
              </p>
            </div>
            <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <UploadArea onUpload={handleUpload} isLoading={isLoading} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Vector Editor</h2>
              <button 
                onClick={() => setSvgContent(null)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Upload another design
              </button>
            </div>
            <div className="flex-1 min-h-[600px]">
              <Editor svgContent={svgContent} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
