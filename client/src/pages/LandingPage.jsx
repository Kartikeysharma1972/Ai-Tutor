import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import CountUp from 'react-countup';
import { FiBookOpen, FiFileText, FiLayers, FiAward, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

const wordVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const rotatingWords = ['Concepts', 'Exams', 'Doubts', 'Projects'];

const tools = [
  { icon: FiBookOpen, title: 'Concept Explainer', desc: 'Ask any question and get structured, grade-adaptive explanations with diagrams and examples.' },
  { icon: FiFileText, title: 'Document Summarizer', desc: 'Upload notes, PDFs, or images and get intelligent summaries and key point extractions.' },
  { icon: FiLayers, title: 'Project Idea Generator', desc: 'Get customized project ideas based on your grade, subject, and project type.' },
  { icon: FiAward, title: 'Exam Preparation', desc: 'Mock tests with analytics and focus area deep-dives for thorough exam prep.' },
];

const steps = [
  { num: '01', title: 'Sign Up', desc: 'Create your account and select your class/grade.' },
  { num: '02', title: 'Choose Your Tool', desc: 'Pick from 4 powerful AI-powered study tools.' },
  { num: '03', title: 'Start Learning', desc: 'Get personalized, grade-adaptive help instantly.' },
];

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setWordIndex(i => (i + 1) % rotatingWords.length), 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Scroll Progress */}
      <motion.div className="scroll-progress-bar" style={{ scaleX: scrollYProgress }} />

      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div initial={{ scale: 1 }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6 }} className="text-2xl font-bold gradient-text">
            AI Tutor
          </motion.div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-primary-500 transition-colors relative group">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-primary-500 transition-colors relative group">
              How it Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-5 py-2 text-primary-500 border border-primary-200 rounded-lg hover:border-primary-400 transition-colors text-sm font-medium">
              Login
            </Link>
            <Link to="/signup" className="shimmer px-5 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium">
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Aurora Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary-200 rounded-full filter blur-[80px] opacity-40 animate-blob-1"></div>
          <div className="absolute top-40 right-10 w-80 h-80 bg-primary-300 rounded-full filter blur-[80px] opacity-30 animate-blob-2"></div>
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-primary-100 rounded-full filter blur-[80px] opacity-50 animate-blob-3"></div>
          <div className="absolute inset-0 dot-grid"></div>
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-block rotating-border rounded-full px-4 py-1.5 text-sm text-primary-600 font-medium mb-6"
            >
              Built for CBSE Classes 1–12
            </motion.div>

            {/* Headline with staggered words */}
            <motion.h1
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4"
            >
              {'Master your '.split(' ').map((word, i) => (
                <motion.span key={i} variants={wordVariants} className="inline-block mr-3">
                  {word}
                </motion.span>
              ))}
              <motion.span variants={wordVariants} className="inline-block relative h-[1.2em] min-w-[200px]">
                <span className="gradient-text">{rotatingWords[wordIndex]}</span>
              </motion.span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-lg text-gray-500 mb-8 max-w-lg mx-auto lg:mx-0"
            >
              Your personalised study companion, powered by AI. Get instant explanations, summaries, project ideas, and exam prep — all tailored to your grade.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/signup" className="shimmer px-8 py-3.5 bg-primary-400 text-white rounded-xl font-semibold text-lg hover:bg-primary-500 hover:scale-[1.04] active:scale-[0.97] transition-all shadow-lg shadow-primary-200">
                Get Started Free <FiArrowRight className="inline ml-2" />
              </Link>
              <Link to="/login" className="px-8 py-3.5 border-2 border-primary-200 text-primary-500 rounded-xl font-semibold text-lg hover:border-primary-400 transition-all">
                Login
              </Link>
            </motion.div>
          </div>

          {/* Hero Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
            className="flex-1 max-w-lg"
          >
            <div className="glass-card p-8 rounded-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                  <FiBookOpen className="text-primary-400 text-xl" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Concept Explainer</div>
                    <div className="text-xs text-gray-400">Ask anything from your syllabus</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <FiCheckCircle className="text-green-400 text-xl" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Mock Test Complete</div>
                    <div className="text-xs text-gray-400">Score: 22/25 · 88% accuracy</div>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">AI Response Preview</div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    Photosynthesis is the process by which green plants make their own food using sunlight. Think of it like a kitchen where the plant cooks food using sunlight as the stove...
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-primary-50/30">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4"
          >
            4 Powerful <span className="gradient-text">AI Tools</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-gray-500 text-center mb-14 max-w-2xl mx-auto"
          >
            Everything you need to study smarter, not harder. Each tool adapts to your grade level automatically.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {tools.map((tool, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
                whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(91,164,207,0.15)' }}
                className="glass-card p-6 rounded-2xl cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <tool.icon className="text-primary-500 text-2xl" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{tool.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tool.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-14"
          >
            How It <span className="gradient-text">Works</span>
          </motion.h2>

          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
                className={`flex items-center gap-8 ${i % 2 !== 0 ? 'flex-row-reverse text-right' : ''}`}
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-500">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">{step.title}</h3>
                  <p className="text-gray-500">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-primary-50/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { end: 4, suffix: '', label: 'AI Tools' },
              { end: 12, suffix: '', label: 'Grades Covered' },
              { end: 50, suffix: '+', label: 'Subjects' },
              { end: 1000, suffix: '+', label: 'Chapters' },
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div className="text-3xl md:text-4xl font-bold text-primary-500">
                  <CountUp end={stat.end} duration={1.5} suffix={stat.suffix} enableScrollSpy scrollSpyOnce />
                </div>
                <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold gradient-text">AI Tutor</div>
          <p className="text-gray-400 text-sm">Built for CBSE students, Classes 1–12. Powered by AI.</p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-primary-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary-400 transition-colors">How it Works</a>
            <Link to="/signup" className="hover:text-primary-400 transition-colors">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
