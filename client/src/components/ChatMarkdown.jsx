import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { FiImage, FiRefreshCw } from 'react-icons/fi';

function ImageWithLoader({ src, alt }) {
  const [state, setState] = useState('idle');
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const startLoading = () => {
    setState('loading');
    timeoutRef.current = setTimeout(() => {
      setState('timeout');
    }, 25000);
  };

  const handleLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState('loaded');
  };

  const handleError = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState('error');
  };

  if (state === 'idle') {
    return (
      <div className="my-3">
        <button
          onClick={startLoading}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all group"
        >
          <FiImage className="text-blue-500 text-lg" />
          <div className="text-left">
            <p className="text-sm font-medium text-blue-700">
              {alt || 'Illustration'}
            </p>
            <p className="text-xs text-blue-400">Click to generate image</p>
          </div>
        </button>
      </div>
    );
  }

  if (state === 'error' || state === 'timeout') {
    return (
      <div className="my-3">
        <button
          onClick={startLoading}
          className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all"
        >
          <FiRefreshCw className="text-red-400" />
          <div className="text-left">
            <p className="text-sm font-medium text-red-600">
              {state === 'timeout' ? 'Image took too long' : 'Failed to load'}
            </p>
            <p className="text-xs text-red-400">Click to retry</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="my-3">
      {state === 'loading' && (
        <div className="w-full h-48 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
          <div className="text-center">
            <FiImage className="text-gray-400 text-2xl mx-auto mb-2 animate-bounce" />
            <span className="text-xs text-gray-400">Generating image...</span>
          </div>
        </div>
      )}
      <img
        src={state === 'loading' || state === 'loaded' ? src : undefined}
        alt={alt || 'illustration'}
        className={`rounded-xl max-w-full max-h-72 object-contain border border-gray-200 shadow-sm ${state === 'loaded' ? '' : 'hidden'}`}
        onLoad={handleLoad}
        onError={handleError}
      />
      {state === 'loaded' && alt && (
        <p className="text-xs text-gray-400 mt-1 text-center italic">{alt}</p>
      )}
    </div>
  );
}

export default function ChatMarkdown({ content }) {
  return (
    <div className="chat-markdown text-sm text-gray-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ src, alt }) => <ImageWithLoader src={src} alt={alt} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
