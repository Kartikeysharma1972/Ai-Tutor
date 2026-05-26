import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiDownload, FiEye, FiEyeOff, FiBookOpen, FiMap, FiHelpCircle, FiEdit3 } from 'react-icons/fi';
import AppLayout from '../components/AppLayout';
import ChatMarkdown from '../components/ChatMarkdown';
import { useAuth } from '../contexts/AuthContext';
import { aiAPI, curriculumAPI } from '../utils/api';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'concepts', label: 'Concepts', icon: FiBookOpen },
  { id: 'mindmap', label: 'Mind Map', icon: FiMap },
  { id: 'exam-questions', label: 'Exam Questions', icon: FiHelpCircle },
  { id: 'practice', label: 'Practice', icon: FiEdit3 },
];

function parseSections(markdown) {
  const sections = { concepts: '', mindmap: '', 'exam-questions': '', practice: '' };
  if (!markdown) return sections;

  const lines = markdown.split('\n');
  let currentSection = 'concepts';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('mind map') || lower.includes('concept tree') || lower.includes('concept map')) {
      currentSection = 'mindmap';
    } else if (lower.includes('frequently asked') || lower.includes('exam question')) {
      currentSection = 'exam-questions';
    } else if (lower.includes('practice question')) {
      currentSection = 'practice';
    }
    sections[currentSection] += line + '\n';
  }

  return sections;
}

function parsePracticeQA(markdown) {
  if (!markdown.trim()) return [];
  const blocks = markdown.split(/(?=(?:^|\n)(?:#{1,3}\s*)?(?:\d+[\.\)]\s*|Q\d*[\.:]\s*|[-*]\s*\*\*Q))/i);
  const cards = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.length < 10) continue;

    const answerMatch = trimmed.match(/\n\s*(?:A[\.:]\s*|(?:\*\*)?Answer[\.:]\s*(?:\*\*)?)([\s\S]*)/i);
    if (answerMatch) {
      const question = trimmed.substring(0, answerMatch.index).trim();
      const answer = answerMatch[1].trim();
      if (question && answer) cards.push({ question, answer });
    } else {
      cards.push({ question: trimmed, answer: '' });
    }
  }

  return cards;
}

function PracticeCard({ card, index }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden"
    >
      <div className="p-4">
        <ChatMarkdown content={card.question} />
      </div>
      {card.answer && (
        <>
          <button
            onClick={() => setRevealed(!revealed)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-gray-100 text-sm font-medium text-primary-500 hover:bg-primary-50 transition-colors"
          >
            {revealed ? <><FiEyeOff size={14} /> Hide Answer</> : <><FiEye size={14} /> Reveal Answer</>}
          </button>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 pb-4 bg-green-50 border-t border-green-100"
            >
              <div className="pt-3">
                <ChatMarkdown content={card.answer} />
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

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
  const [activeTab, setActiveTab] = useState('concepts');

  useEffect(() => {
    if (!subject) { navigate('/exam-prep'); return; }
    if (user?.grade) {
      curriculumAPI.getChapters(user.grade, subject).then(res => setChapters(res.data.chapters)).catch(() => {});
    }
  }, [subject, user?.grade]);

  const handleGenerate = async () => {
    if (!selectedChapter) return toast.error('Select a chapter');
    setLoading(true);
    setResult('');
    setActiveTab('concepts');
    try {
      const res = await aiAPI.focusArea({ subject, chapter: selectedChapter, topic: topic.trim() });
      setResult(res.data.response);
    } catch {
      toast.error('Failed to generate study material');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const win = window.open('', '_blank');
    const heading = topic.trim() ? topic.trim() : 'Full Chapter';
    win.document.write(`
      <html><head><title>Focus Area — ${heading}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6; }
        h1 { color: #5BA4CF; font-size: 20px; }
        h2 { font-size: 16px; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        h3 { font-size: 14px; margin-top: 15px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-size: 12px; }
        ul, ol { padding-left: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td, th { padding: 6px 10px; border: 1px solid #ddd; font-size: 12px; }
      </style></head><body>
      <h1>${subject} — ${selectedChapter}</h1>
      <h2>${heading}</h2>
      <div>${result.replace(/\n/g, '<br>')}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const sections = parseSections(result);
  const practiceCards = parsePracticeQA(sections.practice);

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
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Specific Topic <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="Leave blank to cover the whole chapter"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 outline-none text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Tip: any topic works — even one from a different chapter or subject.
              </p>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              {/* Tab Navigation */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeTab === tab.id
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <Icon size={14} /> {tab.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-500 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <FiDownload size={14} /> PDF
                </button>
              </div>

              {/* Tab Content */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                {activeTab === 'practice' ? (
                  practiceCards.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-400 mb-2">Click each card to reveal the answer</p>
                      {practiceCards.map((card, i) => (
                        <PracticeCard key={i} card={card} index={i} />
                      ))}
                    </div>
                  ) : (
                    <ChatMarkdown content={sections.practice || 'No practice questions available.'} />
                  )
                ) : (
                  <ChatMarkdown content={sections[activeTab] || 'Content not available for this section.'} />
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
