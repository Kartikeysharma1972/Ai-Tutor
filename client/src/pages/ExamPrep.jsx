import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClipboard, FiTarget, FiCheck, FiArrowRight, FiAward } from 'react-icons/fi';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { curriculumAPI } from '../utils/api';
import toast from 'react-hot-toast';

const modeMeta = {
  'mock-test': {
    title: 'Mock Test',
    desc: 'Timed test with full analytics — weak areas, topic-wise accuracy, time management.',
    icon: FiClipboard,
    bullets: ['10+ question types', 'Auto-graded with explanations', 'Detailed performance report'],
    accent: 'from-sky-100 to-sky-200/60',
    iconColor: 'text-sky-600',
  },
  'focus-area': {
    title: 'Focus Area',
    desc: 'Deep study pack on any topic — explanation, mind map, exam Qs, practice cards.',
    icon: FiTarget,
    bullets: ['Topic-level or full chapter', 'Mind maps + practice cards', 'Custom topics supported'],
    accent: 'from-amber-100 to-amber-200/60',
    iconColor: 'text-amber-600',
  },
};

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
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <PageHeader
          icon={FiAward}
          eyebrow="Exam Prep"
          title="Get exam ready."
          subtitle={`Class ${user?.grade} · Pick a prep mode and the AI will tailor everything to your CBSE syllabus.`}
        />

        <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(modeMeta).map(([key, m]) => {
            const active = mode === key;
            return (
              <motion.button
                key={key}
                onClick={() => setMode(key)}
                whileTap={{ scale: 0.98 }}
                className={`relative text-left rounded-3xl border-2 p-6 transition-all overflow-hidden ${
                  active
                    ? 'border-primary-400 bg-primary-50/40 shadow-[0_18px_40px_-22px_rgba(46,134,193,0.4)]'
                    : 'border-gray-100 bg-white hover:border-primary-200'
                }`}
              >
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${m.accent} blur-2xl opacity-${active ? '100' : '60'}`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 grid place-items-center ${m.iconColor}`}>
                      <m.icon className="text-xl" />
                    </div>
                    {active && (
                      <span className="w-7 h-7 rounded-full bg-primary-500 text-white grid place-items-center shadow-sm">
                        <FiCheck size={14} />
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-display font-bold text-lg text-gray-900">{m.title}</h3>
                  <p className="mt-1.5 text-[13.5px] text-gray-600 leading-relaxed">{m.desc}</p>
                  <ul className="mt-4 space-y-1.5">
                    {m.bullets.map(b => (
                      <li key={b} className="flex items-center gap-2 text-[12.5px] text-gray-600">
                        <FiCheck className="text-emerald-500 flex-shrink-0" size={12} /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.button>
            );
          })}
        </div>

        {mode && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-7 surface p-6"
          >
            <h2 className="font-display font-bold text-[15px] text-gray-900 mb-4">Configure your {modeMeta[mode].title.toLowerCase()}</h2>

            <div className="mb-4">
              <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">Subject <span className="text-rose-500">*</span></label>
              <select
                value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm bg-white"
              >
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {subject && chapters.length > 0 && (
              <div className="mb-2">
                <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
                  {mode === 'focus-area' ? <>Select Chapter <span className="text-rose-500">*</span></> : <>Select Chapters <span className="text-gray-400 font-normal">(optional — leave empty for all)</span></>}
                </label>
                <div className="max-h-72 overflow-y-auto space-y-1 border border-gray-100 rounded-2xl p-2 bg-gray-50/50">
                  {chapters.map((ch, i) => {
                    const selected = selectedChapters.includes(ch);
                    return (
                      <button
                        key={i}
                        onClick={() => mode === 'focus-area' ? setSelectedChapters([ch]) : toggleChapter(ch)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[13px] transition-all flex items-center gap-2.5 ${
                          selected
                            ? 'bg-white text-primary-700 font-semibold shadow-sm border border-primary-100'
                            : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-md border-2 grid place-items-center flex-shrink-0 ${
                          selected ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {selected && <FiCheck size={11} />}
                        </span>
                        <span className="text-gray-400 font-medium">{i + 1}.</span>
                        <span className="truncate">{ch}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11.5px] text-gray-400">
                  {selectedChapters.length === 0
                    ? mode === 'focus-area' ? 'Pick exactly one chapter to focus on.' : 'No chapters picked — test will cover all chapters.'
                    : `${selectedChapters.length} chapter${selectedChapters.length === 1 ? '' : 's'} selected`}
                </p>
              </div>
            )}

            <button
              onClick={handleProceed}
              disabled={!subject}
              className="w-full mt-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:opacity-95 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_10px_28px_-12px_rgba(46,134,193,0.5)]"
            >
              {mode === 'mock-test' ? 'Start Mock Test' : 'Start Focus Area'} <FiArrowRight />
            </button>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
