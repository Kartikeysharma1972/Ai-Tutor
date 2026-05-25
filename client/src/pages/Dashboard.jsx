import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBookOpen, FiFileText, FiLayers, FiAward, FiArrowRight } from 'react-icons/fi';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/AuthContext';

const tools = [
  {
    path: '/concept-explainer',
    icon: FiBookOpen,
    title: 'Concept Explainer',
    desc: 'Ask any question and get structured, grade-adaptive explanations with diagrams and examples.',
    color: 'bg-blue-50 text-blue-500',
    border: 'hover:border-blue-200',
  },
  {
    path: '/document-summarizer',
    icon: FiFileText,
    title: 'Document Summarizer',
    desc: 'Upload notes, PDFs, or images and get intelligent summaries and key points.',
    color: 'bg-green-50 text-green-500',
    border: 'hover:border-green-200',
  },
  {
    path: '/project-generator',
    icon: FiLayers,
    title: 'Project Idea Generator',
    desc: 'Get customized project ideas based on your grade, subject, and project type.',
    color: 'bg-purple-50 text-purple-500',
    border: 'hover:border-purple-200',
  },
  {
    path: '/exam-prep',
    icon: FiAward,
    title: 'Exam Preparation',
    desc: 'Mock tests with analytics and focus area deep-dives for thorough exam prep.',
    color: 'bg-orange-50 text-orange-500',
    border: 'hover:border-orange-200',
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-400 mb-8">Class {user?.grade} · Choose a tool to start learning</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.path}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Link
                  to={tool.path}
                  className={`block p-6 bg-white rounded-2xl border border-gray-100 ${tool.border} transition-all hover:shadow-lg group`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-4`}>
                      <tool.icon className="text-2xl" />
                    </div>
                    <FiArrowRight className="text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">{tool.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{tool.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
