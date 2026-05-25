import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw } from 'react-icons/fi';
import AppLayout from '../components/AppLayout';
import ChatMarkdown from '../components/ChatMarkdown';
import { useAuth } from '../contexts/AuthContext';
import { aiAPI, curriculumAPI } from '../utils/api';
import toast from 'react-hot-toast';

const projectTypes = [
  'Physical Model', 'Chart / Poster', 'Presentation (PPT)',
  'Website / App', 'Science Experiment', 'Research Report',
];

export default function ProjectGenerator() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState('');
  const [projectType, setProjectType] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (user?.grade) {
      curriculumAPI.getSubjects(user.grade).then(res => setSubjects(res.data.subjects)).catch(() => {});
    }
  }, [user?.grade]);

  const handleGenerate = async () => {
    if (!subject) return toast.error('Please select a subject');
    setLoading(true);
    setResult('');
    try {
      const res = await aiAPI.projectIdeas({ subject, projectType, topic });
      setResult(res.data.response);
    } catch {
      toast.error('Failed to generate ideas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout activeTool="project-generator">
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Project Idea Generator</h1>
          <p className="text-sm text-gray-400 mb-6">Get AI-generated project ideas tailored to your grade and subject</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Subject *</label>
              <select
                value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm bg-white"
              >
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Project Type</label>
              <select
                value={projectType} onChange={e => setProjectType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm bg-white"
              >
                <option value="">Any type</option>
                {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Specific Topic (optional)</label>
            <input
              type="text" value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, Trigonometry..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
            />
          </div>

          <button
            onClick={handleGenerate} disabled={loading}
            className="w-full py-3 bg-primary-400 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Generating...' : <><FiRefreshCw /> Generate Ideas</>}
          </button>

          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Project Ideas</h3>
                <button onClick={handleGenerate} disabled={loading} className="text-sm text-primary-400 hover:text-primary-500 flex items-center gap-1">
                  <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Regenerate
                </button>
              </div>
              <div>
                <ChatMarkdown content={result} />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
