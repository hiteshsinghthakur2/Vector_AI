import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface UploadAreaProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export function UploadArea({ onUpload, isLoading }: UploadAreaProps) {
  const [loadingText, setLoadingText] = useState("Processing with AI...");

  useEffect(() => {
    if (!isLoading) {
      setLoadingText("Processing with AI...");
      return;
    }

    const messages = [
      "Processing with AI...",
      "Analyzing design structure...",
      "Generating vector paths...",
      "Aligning table cells and text...",
      "This is a complex design, please wait...",
      "Almost there, finalizing SVG...",
      "Still working on it... complex designs can take 1-2 minutes."
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = Math.min(currentIndex + 1, messages.length - 1);
      setLoadingText(messages[currentIndex]);
    }, 10000); // Change message every 10 seconds

    return () => clearInterval(interval);
  }, [isLoading]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isLoading
  } as any);

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-indigo-100 rounded-full">
          <UploadCloud className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop your design here' : 'Drag & drop your design'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Supports Image (PNG, JPG) and PDF formats
          </p>
        </div>
        {isLoading && (
          <div className="mt-4 flex flex-col items-center space-y-2 text-indigo-600">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium transition-opacity duration-500">{loadingText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
