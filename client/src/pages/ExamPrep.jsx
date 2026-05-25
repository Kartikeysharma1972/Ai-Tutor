import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClipboard, FiTarget } from 'react-icons/fi';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { curriculumAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function ExamPrep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [subject, setSubject] = useState('');
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (user?.grade) {
      curriculumAPI.getSubjects(user.grade).then(res => setSubjects(res.data.subjects)).catch(() => {});
    }
  }, [user?.grade]);

  useEffect(() => {
    if (subject && user?.grade) {
      curriculumAPI.getChapters(user.grade, subject).then(res => setChapters(res.data.chapters)).catch(() => {});
      setSelectedChapters([]);
    }
  }, [subject, user?.grade]);

  const toggleChapter = (ch) => {
    setSelectedChapters(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const handleProceed = () => {
    if (!subject) return toast.error('Select a subject');
    if (mode === 'mock-test') {
      navigate('/mock-test', { state: { subject, chapters: selectedChapters } });
    } else if (mode === 'focus-area') {
      if (selectedChapters.length === 0) return toast.error('Select at least one chapter for focus area');
      navigate('/focus-area', { state: { subject, chapter: selectedChapters[0] } });
    }
  };

  return (
    <AppLayout activeTool="exam-prep">
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Exam Preparation</h1>
          <p className="text-sm text-gray-400 mb-6">Class {user?.grade} · Choose your prep mode</p>

          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setMode('mock-test')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                mode === 'mock-test' ? 'border-primary-400 bg-primary-50' : 'border-gray-100 hover:border-primary-200'
              }`}
            >
              <FiClipboard className={`text-2xl mb-3 ${mode === 'mock-test' ? 'text-primary-500' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-800 mb-1">Mock Test</h3>
              <p className="text-sm text-gray-400">Timed test with scoring, analytics, and detailed solutions</p>
            </button>
            <button
              onClick={() => setMode('focus-area')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                mode === 'focus-area' ? 'border-primary-400 bg-primary-50' : 'border-gray-100 hover:border-primary-200'
              }`}
            >
              <FiTarget className={`text-2xl mb-3 ${mode === 'focus-area' ? 'text-primary-500' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-800 mb-1">Focus Area</h3>
              <p className="text-sm text-gray-400">Deep study on a specific topic with notes, mind maps, and practice</p>
            </button>
          </div>

          {mode && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Subject Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Subject *</label>
                <select
                  value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 outline-none text-sm bg-white"
                >
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Chapter Selector */}
              {subject && chapters.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    {mode === 'focus-area' ? 'Select Chapter *' : 'Select Chapters (optional — leave empty for all)'}
                  </label>
                  <div className="max-h-60 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-3">
                    {chapters.map((ch, i) => (
                      <button
                        key={i}
                        onClick={() => mode === 'focus-area' ? setSelectedChapters([ch]) : toggleChapter(ch)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedChapters.includes(ch) ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}. {ch}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleProceed}
                className="w-full py-3 bg-primary-400 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors"
              >
                {mode === 'mock-test' ? 'Start Mock Test' : 'Start Focus Area'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
