import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiHome, FiBookOpen, FiFileText, FiLayers, FiAward, FiChevronDown, FiLogOut, FiTrash2, FiPlus, FiClock } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { sessionAPI } from '../utils/api';
import toast from 'react-hot-toast';

const toolNav = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
  { path: '/concept-explainer', icon: FiBookOpen, label: 'Concept Explainer', tool: 'concept-explainer' },
  { path: '/document-summarizer', icon: FiFileText, label: 'Document Summarizer', tool: 'document-summarizer' },
  { path: '/project-generator', icon: FiLayers, label: 'Project Generator', tool: 'project-generator' },
  { path: '/exam-prep', icon: FiAward, label: 'Exam Preparation', tool: 'exam-prep' },
];

export default function AppLayout({ children, activeTool }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const { user, logout, updateGrade } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTool) {
      sessionAPI.list(activeTool).then(res => setSessions(res.data.sessions)).catch(() => {});
    } else {
      sessionAPI.list().then(res => setSessions(res.data.sessions)).catch(() => {});
    }
  }, [activeTool, location.pathname]);

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await sessionAPI.delete(id);
      setSessions(s => s.filter(sess => sess._id !== id));
      toast.success('Session deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleGradeChange = async (newGrade) => {
    try {
      await updateGrade(newGrade);
      setGradeModalOpen(false);
      toast.success(`Grade updated to Class ${newGrade}`);
    } catch { toast.error('Failed to update grade'); }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-[280px] bg-white border-r border-gray-100 flex flex-col fixed lg:relative h-full z-40"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <Link to="/dashboard" className="text-xl font-bold gradient-text">AI Tutor</Link>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
                <FiX className="text-gray-400" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="p-3 space-y-1">
              {toolNav.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    location.pathname.startsWith(item.path)
                      ? 'bg-primary-50 text-primary-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="text-lg" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Session History */}
            <div className="flex-1 overflow-hidden flex flex-col border-t border-gray-100 mt-2">
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">History</span>
                {activeTool && (
                  <button onClick={() => navigate(`/${activeTool}`)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-500">
                    <FiPlus className="text-sm" />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                {sessions.length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-4">No sessions yet</p>
                )}
                {sessions.map(s => (
                  <div
                    key={s._id}
                    onClick={() => navigate(`/${s.tool}/${s._id}`)}
                    className="group flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FiClock className="text-gray-300 flex-shrink-0 text-xs" />
                      <span className="truncate">{s.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(s._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                    >
                      <FiTrash2 className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            <FiMenu className="text-gray-500" />
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 font-semibold text-sm">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="text-sm text-left hidden sm:block">
                <div className="font-medium text-gray-700">{user?.name}</div>
                <div className="text-xs text-gray-400">Class {user?.grade}</div>
              </div>
              <FiChevronDown className="text-gray-400 text-sm" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <div className="font-medium text-gray-700">{user?.name}</div>
                    <div className="text-xs text-gray-400">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); setGradeModalOpen(true); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-between"
                  >
                    Change Grade <span className="text-xs text-primary-400 bg-primary-50 px-2 py-0.5 rounded-full">Class {user?.grade}</span>
                  </button>
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FiLogOut /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Grade Change Modal */}
      <AnimatePresence>
        {gradeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setGradeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Your Grade</h3>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                  <button
                    key={g}
                    onClick={() => handleGradeChange(g)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      user?.grade === g
                        ? 'bg-primary-400 text-white shadow-md'
                        : 'bg-gray-50 text-gray-600 hover:bg-primary-50 hover:text-primary-500'
                    }`}
                  >
                    Class {g}
                  </button>
                ))}
              </div>
              <button onClick={() => setGradeModalOpen(false)} className="w-full mt-4 py-2 text-gray-400 text-sm hover:text-gray-600">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
