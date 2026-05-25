import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiChevronLeft, FiChevronRight, FiAlertCircle, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { aiAPI } from '../utils/api';
import toast from 'react-hot-toast';

const instructions = [
  'Read all questions carefully before answering.',
  'Each question carries equal marks unless specified.',
  'There is no negative marking.',
  'Use paper and pen/pencil for rough work.',
  'Do not refresh or close the browser during the test.',
  'Manage your time wisely — keep an eye on the timer.',
  'Attempt all questions before submitting.',
  'Click "Submit Test" after completing all questions.',
  'The timer will automatically submit the test once time is over.',
];

const typeLabels = {
  'mcq': 'MCQ', 'true-false': 'True / False', 'fill-blank': 'Fill in the Blank',
  'match-following': 'Match the Following', 'matrix-match': 'Matrix Match',
  'sequence-ordering': 'Sequence Ordering', 'assertion-reason': 'Assertion & Reason',
  'case-study': 'Case Study', 'numerical': 'Numerical', 'one-word': 'One Word Answer',
  'hots': 'HOTS', 'code-output': 'Code Output', 'multi-select': 'Multi-Select',
  'integer-type': 'Integer Type',
};
function formatType(type) { return typeLabels[type] || type; }

function MatchFollowingInput({ question, current, answers, handleAnswer }) {
  const pairs = question.pairs || [];
  const leftItems = pairs.map(p => p.left);
  const rightItems = pairs.map(p => p.right);
  const currentMatches = answers[current] ? (typeof answers[current] === 'object' ? answers[current] : {}) : {};

  const updateMatch = (leftIdx, rightVal) => {
    const updated = { ...currentMatches, [leftIdx]: rightVal };
    const formatted = leftItems.map((_, i) => `${i + 1}-${updated[i] || '?'}`).join(', ');
    handleAnswer(current, formatted);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="font-medium text-sm text-gray-500 border-b pb-1">Column A</div>
        <div className="font-medium text-sm text-gray-500 border-b pb-1">Match with</div>
      </div>
      {leftItems.map((left, i) => (
        <div key={i} className="grid grid-cols-2 gap-4 items-center">
          <div className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{i + 1}. {left}</div>
          <select
            value={currentMatches[i] || ''}
            onChange={e => updateMatch(i, e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:border-primary-400 outline-none"
          >
            <option value="">Select</option>
            {rightItems.map((r, j) => <option key={j} value={String.fromCharCode(65 + j)}>{String.fromCharCode(65 + j)}. {r}</option>)}
          </select>
        </div>
      ))}
      <div className="mt-3 p-3 bg-blue-50 rounded-xl">
        <p className="text-xs text-gray-500 font-medium mb-1">Options (Column B):</p>
        {rightItems.map((r, j) => <p key={j} className="text-sm text-gray-600">{String.fromCharCode(65 + j)}. {r}</p>)}
      </div>
    </div>
  );
}

function SequenceOrderingInput({ question, current, answers, handleAnswer }) {
  const [items, setItems] = useState(question.items || []);

  useEffect(() => { setItems(question.items || []); }, [question]);

  const moveItem = (idx, dir) => {
    const newItems = [...items];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newItems.length) return;
    [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
    setItems(newItems);
    handleAnswer(current, newItems.join(', '));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-2">Use arrows to arrange in correct order:</p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-sm font-medium text-gray-400 w-6">{i + 1}.</span>
          <span className="text-sm text-gray-700 flex-1">{item}</span>
          <div className="flex flex-col gap-0.5">
            <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-primary-500 disabled:opacity-20"><FiArrowUp size={14} /></button>
            <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="text-gray-400 hover:text-primary-500 disabled:opacity-20"><FiArrowDown size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MultiSelectInput({ question, current, answers, handleAnswer }) {
  const selected = answers[current] ? answers[current].split(', ').filter(Boolean) : [];

  const toggleOption = (opt) => {
    const updated = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    handleAnswer(current, updated.join(', '));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-1">Select all correct answers:</p>
      {(question.options || []).map((opt, i) => (
        <button
          key={i}
          onClick={() => toggleOption(opt)}
          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
            selected.includes(opt)
              ? 'border-primary-400 bg-primary-50 text-primary-700 font-medium'
              : 'border-gray-100 hover:border-primary-200 text-gray-600'
          }`}
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded border mr-3 text-xs ${selected.includes(opt) ? 'bg-primary-400 text-white border-primary-400' : 'border-gray-300'}">{selected.includes(opt) ? '✓' : ''}</span>
          {String.fromCharCode(65 + i)}. {opt}
        </button>
      ))}
    </div>
  );
}

function QuestionInput({ type, question, current, answers, handleAnswer }) {
  if (type === 'match-following' || type === 'matrix-match') {
    return <MatchFollowingInput question={question} current={current} answers={answers} handleAnswer={handleAnswer} />;
  }
  if (type === 'sequence-ordering') {
    return <SequenceOrderingInput question={question} current={current} answers={answers} handleAnswer={handleAnswer} />;
  }
  if (type === 'multi-select') {
    return <MultiSelectInput question={question} current={current} answers={answers} handleAnswer={handleAnswer} />;
  }
  if (question.options && question.options.length > 0) {
    return (
      <div className="space-y-3">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(current, opt)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
              answers[current] === opt
                ? 'border-primary-400 bg-primary-50 text-primary-700 font-medium'
                : 'border-gray-100 hover:border-primary-200 text-gray-600'
            }`}
          >
            <span className="font-medium text-gray-400 mr-3">{String.fromCharCode(65 + i)}.</span> {opt}
          </button>
        ))}
      </div>
    );
  }
  return (
    <input
      type="text"
      value={answers[current] || ''}
      onChange={e => handleAnswer(current, e.target.value)}
      placeholder={
        type === 'numerical' || type === 'integer-type' ? 'Enter your numerical answer...' :
        type === 'fill-blank' ? 'Fill in the blank...' :
        type === 'one-word' ? 'Enter one word answer...' :
        'Type your answer...'
      }
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 outline-none text-sm"
    />
  );
}

export default function MockTest() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subject, chapters } = location.state || {};

  const [phase, setPhase] = useState('loading');
  const [questions, setQuestions] = useState([]);
  const [config, setConfig] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!subject) { navigate('/exam-prep'); return; }
    generateTest();
  }, []);

  const generateTest = async () => {
    setPhase('loading');
    try {
      const res = await aiAPI.generateMockTest({ subject, chapters });
      setQuestions(res.data.questions.map(q => ({ ...q, studentAnswer: null })));
      setConfig(res.data.config);
      setTimeLeft(res.data.config.totalTime * 60);
      setPhase('info');
    } catch {
      toast.error('Failed to generate test');
      navigate('/exam-prep');
    }
  };

  const startTest = () => {
    setPhase('test');
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleAnswer = (questionIndex, answer) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    setQuestions(prev => prev.map((q, i) => i === questionIndex ? { ...q, studentAnswer: answer } : q));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;

    try {
      const res = await aiAPI.submitMockTest({
        subject, chapters,
        questions: questions.map((q, i) => ({ ...q, studentAnswer: answers[i] ?? null })),
        timeTaken,
      });
      navigate(`/test-result/${res.data.testId}`, { state: { result: res.data } });
    } catch {
      toast.error('Failed to submit test');
      setSubmitting(false);
    }
  }, [submitting, questions, answers, subject, chapters, navigate]);

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const answeredCount = Object.keys(answers).length;

  if (phase === 'loading') {
    return (
      <AppLayout activeTool="exam-prep">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
            <p className="text-gray-500">Generating your mock test...</p>
            <p className="text-xs text-gray-300 mt-1">This may take a moment</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (phase === 'info') {
    return (
      <AppLayout activeTool="exam-prep">
        <div className="p-6 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-xl font-bold text-gray-800 mb-4">Mock Test — {subject}</h1>

            <div className="bg-primary-50 rounded-2xl p-5 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><div className="text-2xl font-bold text-primary-500">{questions.length}</div><div className="text-xs text-gray-500">Questions</div></div>
                <div><div className="text-2xl font-bold text-primary-500">{config?.totalTime} min</div><div className="text-xs text-gray-500">Duration</div></div>
                <div><div className="text-2xl font-bold text-primary-500">Mixed</div><div className="text-xs text-gray-500">Difficulty</div></div>
                <div><div className="text-2xl font-bold text-primary-500">Class {user?.grade}</div><div className="text-xs text-gray-500">Level</div></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FiAlertCircle className="text-yellow-500" /> Instructions</h3>
              <ol className="space-y-2">
                {instructions.map((inst, i) => (
                  <li key={i} className="text-sm text-gray-500 flex gap-2"><span className="text-gray-300 font-medium">{i + 1}.</span> {inst}</li>
                ))}
              </ol>
              {user?.grade <= 5 && <p className="mt-3 text-sm text-primary-500 font-medium">Try your best! Read carefully and have fun learning.</p>}
            </div>

            <button onClick={startTest} className="w-full py-3 bg-primary-400 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors text-lg">
              Start Test
            </button>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  const q = questions[current];

  return (
    <AppLayout activeTool="exam-prep">
      <div className="flex flex-col h-full">
        {/* Timer Bar */}
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-gray-500">Q {current + 1}/{questions.length}</span>
          <div className={`flex items-center gap-1.5 font-mono font-semibold ${timeLeft < 60 ? 'text-red-500' : 'text-gray-700'}`}>
            <FiClock /> {formatTime(timeLeft)}
          </div>
          <span className="text-sm text-gray-400">{answeredCount}/{questions.length} answered</span>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
          {q && (
            <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  q.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                  q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>{q.difficulty}</span>
                <span className="text-xs text-gray-300">{q.topic}</span>
              </div>

              <div className="flex items-center gap-2 mb-1">
                {q.type && <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-600 font-medium">{formatType(q.type)}</span>}
              </div>

              <h2 className="text-lg font-medium text-gray-800 mb-6 leading-relaxed whitespace-pre-line">{q.question}</h2>

              <QuestionInput type={q.type} question={q} current={current} answers={answers} handleAnswer={handleAnswer} />
            </motion.div>
          )}
        </div>

        {/* Question Navigation */}
        <div className="bg-white border-t border-gray-100 p-4 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5 mb-3 justify-center max-w-3xl mx-auto">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  i === current ? 'bg-primary-400 text-white' :
                  answers[i] !== undefined ? 'bg-primary-100 text-primary-600' :
                  'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <button
              onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30"
            >
              <FiChevronLeft /> Previous
            </button>
            {current === questions.length - 1 ? (
              <button
                onClick={handleSubmit} disabled={submitting}
                className="px-6 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            ) : (
              <button
                onClick={() => setCurrent(Math.min(questions.length - 1, current + 1))}
                className="flex items-center gap-1 px-4 py-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                Next <FiChevronRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
