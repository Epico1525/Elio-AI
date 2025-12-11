import React from 'react';
import { Loader2, BrainCircuit } from 'lucide-react';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-glass-100 backdrop-blur-md border border-glass-border w-fit animate-pulse shadow-lg">
      <div className="relative">
        <BrainCircuit className="w-5 h-5 text-blue-400" />
        <div className="absolute inset-0 bg-blue-400/20 blur-lg rounded-full"></div>
      </div>
      <span className="text-sm text-gray-300 font-mono">Analyzing...</span>
      <Loader2 className="w-4 h-4 text-blue-400/80 animate-spin ml-2" />
    </div>
  );
};

export default ThinkingIndicator;