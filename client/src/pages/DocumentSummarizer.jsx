import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiFileText, FiSearch, FiList, FiAlignLeft } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AppLayout from '../components/AppLayout';
import { aiAPI } from '../utils/api';
import toast from 'react-hot-toast';

const modes = [
  { key: 'full', label: 'Full Summary', icon: FiAlignLeft, desc: 'Comprehensive overview of the entire document' },
  { key: 'key-points', label: 'Key Points', icon: FiList, desc: 'Bullet-style important points extracted' },
  { key: 'search', label: 'Search', icon: FiSearch, desc: 'Ask a specific question about the content' },
];

const MAX_WORDS = 5000;

export default function DocumentSummarizer() {
  const [mode, setMode] = useState('full');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [inputMode, setInputMode] = useState('upload');

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSubmit = async () => {
    if (inputMode === 'text' && !text.trim()) return toast.error('Please enter some text');
    if (inputMode === 'upload' && !file) return toast.error('Please upload a file');
    if (mode === 'search' && !query.trim()) return toast.error('Please enter a search query');
    if (inputMode === 'text' && wordCount > MAX_WORDS) return toast.error(`Text exceeds ${MAX_WORDS} word limit`);

    setLoading(true);
    setResult('');
    try {
      const formData = new FormData();
      if (inputMode === 'upload' && file) formData.append('file', file);
      if (inputMode === 'text') formData.append('text', text);
      formData.append('mode', mode);
      if (mode === 'search') formData.append('query', query);

      const res = await aiAPI.summarize(formData);
      setResult(res.data.response);
    } catch (err) {
      toast.error('Failed to summarize');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout activeTool="document-summarizer">
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Document Summarizer</h1>
          <p className="text-sm text-gray-400 mb-6">Upload study material or paste text to get intelligent summaries</p>

          {/* Mode Selector */}
          <div className="flex gap-3 mb-6">
            {modes.map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === m.key ? 'bg-primary-400 text-white shadow-md' : 'bg-white border border-gray-100 text-gray-500 hover:border-primary-200'
                }`}
              >
                <m.icon /> {m.label}
              </button>
            ))}
          </div>

          {mode === 'search' && (
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="What do you want to find in the document?"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm mb-4"
            />
          )}

          {/* Input Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setInputMode('upload')} className={`px-4 py-1.5 rounded-lg text-sm ${inputMode === 'upload' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
              Upload File
            </button>
            <button onClick={() => setInputMode('text')} className={`px-4 py-1.5 rounded-lg text-sm ${inputMode === 'text' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
              Paste Text
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}
            >
              <input {...getInputProps()} />
              <FiUploadCloud className="text-4xl text-gray-300 mx-auto mb-3" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Drop a PDF or image here, or click to browse</p>
                  <p className="text-xs text-gray-300 mt-1">Max 10MB · PDF, JPG, PNG</p>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste your study material here..."
                className="w-full h-48 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm resize-none"
              />
              <div className={`absolute bottom-3 right-3 text-xs ${wordCount > MAX_WORDS ? 'text-red-400' : 'text-gray-300'}`}>
                {wordCount}/{MAX_WORDS} words
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-4 py-3 bg-primary-400 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Summarizing...' : 'Summarize'}
          </button>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-white rounded-2xl border border-gray-100 p-6"
            >
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FiFileText className="text-primary-400" /> Summary
              </h3>
              <div className="chat-markdown text-sm text-gray-600">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
