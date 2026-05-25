import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSend, FiImage, FiX, FiMic, FiMicOff, FiBook, FiChevronDown, FiPaperclip } from 'react-icons/fi';
import AppLayout from '../components/AppLayout';
import ChatMarkdown from '../components/ChatMarkdown';
import { useAuth } from '../contexts/AuthContext';
import { aiAPI, sessionAPI, curriculumAPI } from '../utils/api';
import toast from 'react-hot-toast';

const levels = [
  { key: 'beginner', label: 'Beginner', desc: 'CBSE standard' },
  { key: 'intermediate', label: 'Intermediate', desc: 'Added depth' },
  { key: 'advanced', label: 'Advanced', desc: 'Competitive level' },
];

async function fetchWikipediaImage(query) {
  try {
    const q = encodeURIComponent(query.substring(0, 80).trim());
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`);
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail?.source) {
        return { url: data.thumbnail.source.replace(/\/\d+px-/, '/500px-'), alt: data.title };
      }
    }
    return null;
  } catch {
    return null;
  }
}

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

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
  const [docFile, setDocFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [showScope, setShowScope] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (user?.grade) {
      curriculumAPI.getSubjects(user.grade).then(res => setSubjects(res.data.subjects)).catch(() => {});
    }
  }, [user?.grade]);

  useEffect(() => {
    if (subject && user?.grade) {
      curriculumAPI.getChapters(user.grade, subject).then(res => setChapters(res.data.chapters)).catch(() => {});
      setChapter('');
    } else {
      setChapters([]);
    }
  }, [subject, user?.grade]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (!urlSessionId) {
      setMessages([]);
      setSessionId(null);
    }
  }, [subject]);

  useEffect(() => {
    if (urlSessionId) {
      sessionAPI.get(urlSessionId).then(res => {
        setMessages(res.data.session.messages || []);
        setSessionId(urlSessionId);
        if (res.data.session.metadata?.explanationLevel) setLevel(res.data.session.metadata.explanationLevel);
        if (res.data.session.metadata?.subject) setSubject(res.data.session.metadata.subject);
        if (res.data.session.metadata?.chapter) setChapter(res.data.session.metadata.chapter);
      }).catch(() => toast.error('Failed to load session'));
    }
  }, [urlSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice recognition failed. Try again.');
    };

    recognitionRef.current = recognition;
    return () => { try { recognition.abort(); } catch {} };
  }, []);

  const toggleVoice = () => {
    if (!SpeechRecognition) return toast.error('Voice input not supported in this browser');
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

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

  const handleDocSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }
    setDocFile(file);
  };

  const removeDoc = () => {
    setDocFile(null);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() && !imageFile && !docFile) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    const userMessage = input.trim();
    setInput('');
    const displayContent = userMessage || (imageFile ? '[Image uploaded]' : docFile ? `[File: ${docFile.name}]` : '');
    setMessages(prev => [...prev, { role: 'user', content: displayContent }]);
    setLoading(true);

    try {
      let response;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('message', userMessage);
        formData.append('explanationLevel', level);
        if (subject) formData.append('subject', subject);
        if (chapter) formData.append('chapter', chapter);
        if (sessionId) formData.append('sessionId', sessionId);
        response = await aiAPI.conceptExplainerImage(formData);
        removeImage();
      } else if (docFile) {
        const formData = new FormData();
        formData.append('file', docFile);
        formData.append('message', userMessage);
        formData.append('explanationLevel', level);
        if (subject) formData.append('subject', subject);
        if (chapter) formData.append('chapter', chapter);
        if (sessionId) formData.append('sessionId', sessionId);
        response = await aiAPI.conceptExplainerFile(formData);
        removeDoc();
      } else {
        response = await aiAPI.conceptExplainer({
          message: userMessage,
          sessionId,
          explanationLevel: level,
          subject: subject || undefined,
          chapter: chapter || undefined,
        });
      }

      setSessionId(response.data.sessionId);
      const aiText = response.data.response;
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);

      if (user?.grade <= 8 && userMessage) {
        fetchWikipediaImage(userMessage).then(img => {
          if (img) {
            const imgMd = `\n\n![${img.alt}](${img.url})\n`;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.content === aiText) {
                return [...prev.slice(0, -1), { ...last, content: last.content + imgMd }];
              }
              return prev;
            });
          }
        });
      }
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
        {/* Top Bar — Level + Subject/Chapter */}
        <div className="px-4 py-2 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 mr-1">Level:</span>
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

            <button
              onClick={() => setShowScope(!showScope)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                subject ? 'bg-primary-50 text-primary-600 border border-primary-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <FiBook size={13} />
              {subject ? `${subject}${chapter ? ' · ' + chapter.substring(0, 25) + (chapter.length > 25 ? '...' : '') : ''}` : 'Select Subject'}
              <FiChevronDown size={12} className={`transition-transform ${showScope ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Subject/Chapter Picker */}
          {showScope && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 pb-1">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:border-primary-400 outline-none"
                >
                  <option value="">All subjects</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={chapter}
                  onChange={e => setChapter(e.target.value)}
                  disabled={!subject}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:border-primary-400 outline-none disabled:opacity-40"
                >
                  <option value="">All chapters</option>
                  {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Concept Explainer</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Ask any question from your Class {user?.grade} syllabus. Select a subject & chapter for more focused answers. You can also use voice, upload an image, or attach a file (PDF, TXT, DOC).
                </p>
                {SpeechRecognition && (
                  <p className="text-xs text-primary-400 mt-2">🎤 Voice input available — click the mic button to speak your question</p>
                )}
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
                  <ChatMarkdown content={msg.content} />
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

        {/* Document Preview */}
        {docFile && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <FiPaperclip className="text-primary-400" />
              <div className="text-xs">
                <p className="font-medium text-gray-700 truncate max-w-[200px]">{docFile.name}</p>
                <p className="text-gray-400">{(docFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={removeDoc} className="ml-1 text-red-400 hover:text-red-500">
                <FiX size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Voice Listening Indicator */}
        {isListening && (
          <div className="px-4 py-2 border-t border-gray-100 bg-red-50">
            <div className="flex items-center gap-2 justify-center">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-red-600 font-medium">Listening... speak now</span>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
            <input type="file" ref={docInputRef} accept=".pdf,.txt,.doc,.docx" onChange={handleDocSelect} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-primary-400 hover:bg-primary-50 rounded-xl transition-colors flex-shrink-0"
              title="Upload image"
            >
              <FiImage className="text-xl" />
            </button>
            <button
              onClick={() => docInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-primary-400 hover:bg-primary-50 rounded-xl transition-colors flex-shrink-0"
              title="Upload file (PDF, TXT, DOC)"
            >
              <FiPaperclip className="text-xl" />
            </button>
            {SpeechRecognition && (
              <button
                onClick={toggleVoice}
                className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                  isListening
                    ? 'bg-red-100 text-red-500 hover:bg-red-200'
                    : 'text-gray-400 hover:text-primary-400 hover:bg-primary-50'
                }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <FiMicOff className="text-xl" /> : <FiMic className="text-xl" />}
              </button>
            )}
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening...' : 'Ask any question...'}
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm max-h-32"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !imageFile && !docFile)}
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
