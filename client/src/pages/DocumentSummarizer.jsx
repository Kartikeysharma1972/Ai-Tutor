import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiUploadCloud, FiFileText, FiSearch, FiList, FiAlignLeft, FiX,
} from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/PageHeader';
import ChatMarkdown from '../components/ChatMarkdown';
import { aiAPI } from '../utils/api';
import toast from 'react-hot-toast';

const modes = [
  { key: 'full', label: 'Full Summary', icon: FiAlignLeft, desc: 'Comprehensive overview' },
  { key: 'key-points', label: 'Key Points', icon: FiList, desc: 'Bullet list of essentials' },
  { key: 'search', label: 'Ask a Question', icon: FiSearch, desc: 'Find a specific answer' },
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
    if (mode === 'search' && !query.trim()) return toast.error('Please enter your question');
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
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <PageHeader
          icon={FiFileText}
          eyebrow="Document Summarizer"
          title="Make sense of any document."
          subtitle="Upload a PDF or image, or paste text. Get a full summary, just the key points, or a direct answer to a question."
        />

        {/* Mode Selector */}
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {modes.map(m => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`relative text-left p-4 rounded-2xl border-2 transition-all ${
                  active
                    ? 'border-primary-400 bg-primary-50/30 shadow-[0_10px_24px_-16px_rgba(46,134,193,0.4)]'
                    : 'border-gray-100 bg-white hover:border-primary-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`grid place-items-center w-9 h-9 rounded-xl ${active ? 'bg-primary-500 text-white' : 'bg-gray-50 text-gray-500'}`}>
                    <m.icon />
                  </span>
                  <div>
                    <p className={`font-semibold text-[13.5px] ${active ? 'text-primary-700' : 'text-gray-800'}`}>{m.label}</p>
                    <p className="text-[11.5px] text-gray-400">{m.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {mode === 'search' && (
          <motion.input
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="What do you want to find in the document?"
            className="w-full mt-5 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm bg-white"
          />
        )}

        {/* Input source segmented */}
        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          <div className="segmented">
            <button onClick={() => setInputMode('upload')} data-active={inputMode === 'upload'}>Upload File</button>
            <button onClick={() => setInputMode('text')} data-active={inputMode === 'text'}>Paste Text</button>
          </div>
          {inputMode === 'text' && (
            <span className={`text-[11.5px] font-semibold ${wordCount > MAX_WORDS ? 'text-rose-500' : 'text-gray-400'}`}>
              {wordCount} / {MAX_WORDS} words
            </span>
          )}
        </div>

        {inputMode === 'upload' ? (
          <div
            {...getRootProps()}
            className={`mt-4 border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="inline-flex w-14 h-14 rounded-2xl bg-primary-50 text-primary-500 items-center justify-center mb-3 mx-auto">
              <FiUploadCloud className="text-2xl" />
            </div>
            {file ? (
              <div>
                <p className="text-[14px] font-semibold text-gray-800">{file.name}</p>
                <p className="text-[11.5px] text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] text-rose-500 hover:underline"
                >
                  <FiX size={12} /> Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="text-[14px] font-semibold text-gray-700">Drop a PDF or image here</p>
                <p className="text-[12px] text-gray-400 mt-1">or click to browse · Max 10MB · PDF, JPG, PNG</p>
              </div>
            )}
          </div>
        ) : (
          <div className="relative mt-4">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste your study material here…"
              className="w-full h-56 px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm resize-none bg-white"
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 shadow-[0_10px_28px_-12px_rgba(46,134,193,0.5)]"
        >
          {loading ? 'Summarizing…' : mode === 'search' ? 'Find Answer' : 'Summarize'}
        </button>

        {loading && (
          <div className="mt-6 surface p-6 space-y-3">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
            <div className="skeleton h-3 w-4/5" />
          </div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 surface p-6"
          >
            <h3 className="font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FiFileText className="text-primary-500" /> Summary
            </h3>
            <ChatMarkdown content={result} />
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
