import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiChevronDown, FiChevronUp, FiArrowLeft } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AppLayout from '../components/AppLayout';
import { sessionAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function TestResult() {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(location.state?.result || null);
  const [expandedQ, setExpandedQ] = useState(null);

  useEffect(() => {
    if (!result && testId) {
      sessionAPI.getTest(testId).then(res => {
        const t = res.data.test;
        setResult({
          score: t.score,
          totalQuestions: t.totalQuestions,
          accuracy: t.accuracy,
          topicWiseAccuracy: t.topicWiseAccuracy,
          weakAreas: t.weakAreas,
          questions: t.questions,
        });
      }).catch(() => toast.error('Failed to load result'));
    }
  }, [testId, result]);

  if (!result) {
    return (
      <AppLayout activeTool="exam-prep">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
        </div>
      </AppLayout>
    );
  }

  const scoreColor = result.accuracy >= 80 ? 'text-green-500' : result.accuracy >= 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <AppLayout activeTool="exam-prep">
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate('/exam-prep')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
            <FiArrowLeft /> Back to Exam Prep
          </button>

          <h1 className="text-xl font-bold text-gray-800 mb-6">Test Results</h1>

          {/* Score Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className={`text-4xl font-bold ${scoreColor}`}>{result.score}/{result.totalQuestions}</div>
                <div className="text-sm text-gray-400 mt-1">Score</div>
              </div>
              <div>
                <div className={`text-4xl font-bold ${scoreColor}`}>{result.accuracy}%</div>
                <div className="text-sm text-gray-400 mt-1">Accuracy</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-500">{result.totalQuestions}</div>
                <div className="text-sm text-gray-400 mt-1">Questions</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-500">{result.weakAreas?.length || 0}</div>
                <div className="text-sm text-gray-400 mt-1">Weak Areas</div>
              </div>
            </div>
          </div>

          {/* Topic-wise Accuracy */}
          {result.topicWiseAccuracy && Object.keys(result.topicWiseAccuracy).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-4">Topic-wise Performance</h3>
              <div className="space-y-3">
                {Object.entries(result.topicWiseAccuracy).map(([topic, data]) => {
                  const pct = Math.round((data.correct / data.total) * 100);
                  return (
                    <div key={topic}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{topic}</span>
                        <span className={`font-medium ${pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {data.correct}/{data.total} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weak Areas */}
          {result.weakAreas?.length > 0 && (
            <div className="bg-red-50 rounded-2xl p-5 mb-6">
              <h3 className="font-semibold text-red-700 mb-2">Weak Areas — Focus on these:</h3>
              <div className="flex flex-wrap gap-2">
                {result.weakAreas.map((area, i) => (
                  <span key={i} className="px-3 py-1 bg-white text-red-600 text-sm rounded-full border border-red-100">{area}</span>
                ))}
              </div>
            </div>
          )}

          {/* Question Review */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Question Review</h3>
            <div className="space-y-3">
              {result.questions?.map((q, i) => (
                <div key={i} className="border border-gray-50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {q.isCorrect ? <FiCheckCircle className="text-green-500" /> : <FiXCircle className="text-red-500" />}
                      <span className="text-sm text-gray-700 text-left">Q{i + 1}. {q.question?.substring(0, 80)}{q.question?.length > 80 ? '...' : ''}</span>
                      {q.type && <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 whitespace-nowrap ml-1">{q.type}</span>}
                    </div>
                    {expandedQ === i ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
                  </button>

                  {expandedQ === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="px-4 pb-4 border-t border-gray-50">
                      <div className="pt-3 space-y-3 text-sm">
                        <p className="text-gray-700"><strong>Question:</strong> {q.question}</p>
                        <p className="text-gray-500"><strong>Your Answer:</strong> <span className={q.isCorrect ? 'text-green-600' : 'text-red-500'}>{q.studentAnswer || 'Not answered'}</span></p>
                        <p className="text-gray-500"><strong>Correct Answer:</strong> <span className="text-green-600 font-medium">{q.correctAnswer}</span></p>
                        {q.explanation && (
                          <div className="bg-blue-50 rounded-xl p-3">
                            <strong className="text-blue-700 text-xs">Explanation:</strong>
                            <div className="chat-markdown text-gray-600 mt-1"><ReactMarkdown remarkPlugins={[remarkGfm]}>{q.explanation}</ReactMarkdown></div>
                          </div>
                        )}
                        {q.studyNotes && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <strong className="text-gray-500 text-xs">Study Notes:</strong>
                            <div className="chat-markdown text-gray-600 mt-1"><ReactMarkdown remarkPlugins={[remarkGfm]}>{q.studyNotes}</ReactMarkdown></div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
