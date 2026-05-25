import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSend, FiImage, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { aiAPI, sessionAPI } from '../utils/api';
import toast from 'react-hot-toast';

const levels = [
  { key: 'beginner', label: 'Beginner', desc: 'CBSE standard' },
  { key: 'intermediate', label: 'Intermediate', desc: 'Added depth' },
  { key: 'advanced', label: 'Advanced', desc: 'Competitive level' },
];

export default function ConceptExplainer() {
  const { sessionId: urlSessionId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(urlSessionId || null);
  const [level, setLevel] = useState('beginner');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (urlSessionId) {
      sessionAPI.get(urlSessionId).then(res => {
        setMessages(res.data.session.messages || []);
        setSessionId(urlSessionId);
        if (res.data.session.metadata?.explanationLevel) setLevel(res.data.session.metadata.explanationLevel);
      }).catch(() => toast.error('Failed to load session'));
    }
  }, [urlSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() && !imageFile) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage || '[Image uploaded]' }]);
    setLoading(true);

    try {
      let response;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('message', userMessage);
        formData.append('explanationLevel', level);
        if (sessionId) formData.append('sessionId', sessionId);
        response = await aiAPI.conceptExplainerImage(formData);
        removeImage();
      } else {
        response = await aiAPI.conceptExplainer({
          message: userMessage,
          sessionId,
          explanationLevel: level,
        });
      }

      setSessionId(response.data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (err) {
      toast.error('Failed to get response');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppLayout activeTool="concept-explainer">
      <div className="flex flex-col h-full">
        {/* Level Selector */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white">
          <span className="text-xs text-gray-400 mr-2">Level:</span>
          {levels.map(l => (
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                level === l.key
                  ? 'bg-primary-400 text-white'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
              title={l.desc}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Concept Explainer</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Ask any question from your Class {user?.grade} syllabus. You can also upload an image of your textbook or notes.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary-400 text-white rounded-br-md'
                  : 'bg-white border border-gray-100 shadow-sm rounded-bl-md'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="chat-markdown text-sm text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <div className="relative inline-block">
              <img src={imagePreview} alt="upload" className="h-20 rounded-lg object-cover" />
              <button onClick={removeImage} className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-0.5">
                <FiX className="text-xs" />
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-primary-400 hover:bg-primary-50 rounded-xl transition-colors flex-shrink-0"
              title="Upload image"
            >
              <FiImage className="text-xl" />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask any question..."
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm max-h-32"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !imageFile)}
              className="p-2.5 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <FiSend className="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
