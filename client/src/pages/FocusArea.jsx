import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { aiAPI, curriculumAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function FocusArea() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subject, chapter } = location.state || {};

  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(chapter || '');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!subject) { navigate('/exam-prep'); return; }
    if (user?.grade) {
      curriculumAPI.getChapters(user.grade, subject).then(res => setChapters(res.data.chapters)).catch(() => {});
    }
  }, [subject, user?.grade]);

  const handleGenerate = async () => {
    if (!selectedChapter) return toast.error('Select a chapter');
    if (!topic.trim()) return toast.error('Enter a specific topic');
    setLoading(true);
    setResult('');
    try {
      const res = await aiAPI.focusArea({ subject, chapter: selectedChapter, topic: topic.trim() });
      setResult(res.data.response);
    } catch {
      toast.error('Failed to generate study material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout activeTool="exam-prep">
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Focus Area — {subject}</h1>
          <p className="text-sm text-gray-400 mb-6">Deep study on a specific topic with comprehensive notes</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Chapter *</label>
              <select
                value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 outline-none text-sm bg-white"
              >
                <option value="">Select chapter</option>
                {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Specific Topic *</label>
              <input
                type="text" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g., Law of Conservation of Mass"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 outline-none text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate} disabled={loading}
            className="w-full py-3 bg-primary-400 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating study material...' : 'Generate Focus Area'}
          </button>

          {loading && (
            <div className="mt-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400 mx-auto mb-3"></div>
              <p className="text-sm text-gray-400">Creating comprehensive study material...</p>
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
              <div className="chat-markdown text-sm text-gray-600 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
