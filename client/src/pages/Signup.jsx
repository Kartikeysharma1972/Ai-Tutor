import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [grade, setGrade] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (!grade) return toast.error('Please select your class');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(name, email, password, grade);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4 py-8"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary-200 rounded-full filter blur-[80px] opacity-30 animate-blob-1"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-primary-100 rounded-full filter blur-[80px] opacity-40 animate-blob-2"></div>
      </div>

      <div className="glass-card p-8 w-full max-w-md relative">
        <Link to="/" className="text-2xl font-bold gradient-text block text-center mb-2">AI Tutor</Link>
        <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">Create your account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
              placeholder="your@email.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Confirm</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Grade Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Select Your Class</label>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                <button
                  key={g} type="button"
                  onClick={() => setGrade(g)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    grade === g
                      ? 'bg-primary-400 text-white shadow-md scale-105'
                      : 'bg-gray-50 text-gray-500 hover:bg-primary-50 hover:text-primary-500'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-primary-400 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account? <Link to="/login" className="text-primary-500 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </motion.div>
  );
}
