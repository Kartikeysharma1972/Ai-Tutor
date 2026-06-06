import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineAcademicCap,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentCheck,
  HiOutlineBolt,
  HiOutlineUserGroup,
  HiOutlineFlag,
} from 'react-icons/hi2';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../utils/api';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';

const CHART_COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46'];

function formatTimeAgo(dateStr) {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatTrend(changePct) {
  if (changePct == null) return { subtitle: null, trend: 'neutral' };
  const pct = Number(changePct);
  if (pct > 0) return { subtitle: `+${pct.toFixed(1)}% vs last week`, trend: 'up' };
  if (pct < 0) return { subtitle: `${pct.toFixed(1)}% vs last week`, trend: 'down' };
  return { subtitle: '0% vs last week', trend: 'neutral' };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flaggedStats, setFlaggedStats] = useState(null);

  useEffect(() => {
    fetchDashboard();
    fetchFlaggedStats();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlaggedStats = async () => {
    try {
      const res = await api.get('/moderation/stats');
      setFlaggedStats(res.data);
    } catch {
      // moderation endpoint may not exist yet
    }
  };

  const trends = data?.trends || {};
  const teacherTrend = formatTrend(trends.teachers?.change_pct);
  const studentTrend = formatTrend(trends.students?.change_pct);
  const lessonTrend = formatTrend(trends.lessons?.change_pct);
  const testTrend = formatTrend(trends.tests?.change_pct);

  const gradeData = data?.students?.grade_distribution
    ? Object.entries(data.students.grade_distribution).map(([grade, count]) => ({
        grade: `Grade ${grade}`,
        students: count,
      }))
    : [];

  const toolData = data?.lessons?.tool_usage
    ? Object.entries(data.lessons.tool_usage).map(([name, count]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: count,
      }))
    : [];

  const pendingFlagged = flaggedStats?.pending ?? 0;

  if (error) {
    return (
      <div>
        <Header title="Dashboard" subtitle="School overview at a glance" />
        <div className="card p-8 text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard" subtitle="School overview at a glance" />

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Teachers"
          value={loading ? null : data?.teachers?.total ?? 0}
          subtitle={teacherTrend.subtitle}
          trend={teacherTrend.trend}
          icon={HiOutlineAcademicCap}
          color="emerald"
          delay={0}
        />
        <StatsCard
          title="Total Students"
          value={loading ? null : data?.students?.total ?? 0}
          subtitle={studentTrend.subtitle}
          trend={studentTrend.trend}
          icon={HiOutlineUsers}
          color="blue"
          delay={0.05}
        />
        <StatsCard
          title="Lessons Generated"
          value={loading ? null : data?.lessons?.total ?? 0}
          subtitle={lessonTrend.subtitle}
          trend={lessonTrend.trend}
          icon={HiOutlineDocumentText}
          color="purple"
          delay={0.1}
        />
        <StatsCard
          title="Mock Tests"
          value={loading ? null : data?.tests?.total ?? 0}
          subtitle={testTrend.subtitle}
          trend={testTrend.trend}
          icon={HiOutlineClipboardDocumentCheck}
          color="amber"
          delay={0.15}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="Active Teachers Today"
          value={loading ? null : data?.teachers?.active_today ?? 0}
          subtitle="Currently active"
          trend="neutral"
          icon={HiOutlineBolt}
          color="cyan"
          delay={0.2}
        />
        <StatsCard
          title="Active Students Today"
          value={loading ? null : data?.students?.active_today ?? 0}
          subtitle="Currently active"
          trend="neutral"
          icon={HiOutlineUserGroup}
          color="rose"
          delay={0.25}
        />
        {pendingFlagged > 0 && (
          <div
            onClick={() => navigate('/chats')}
            className="cursor-pointer"
          >
            <StatsCard
              title="Flagged Chats"
              value={pendingFlagged}
              subtitle={`${pendingFlagged} flagged chat${pendingFlagged !== 1 ? 's' : ''} need review`}
              trend="down"
              icon={HiOutlineFlag}
              color="amber"
              delay={0.3}
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Grade Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h3 className="font-display font-bold text-gray-900 mb-4">Grade Distribution</h3>
          {loading ? (
            <div className="h-64 skeleton rounded-lg" />
          ) : gradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={gradeData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="students" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No grade data available
            </div>
          )}
        </motion.div>

        {/* Tool Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-6"
        >
          <h3 className="font-display font-bold text-gray-900 mb-4">Tool Usage</h3>
          {loading ? (
            <div className="h-64 skeleton rounded-lg" />
          ) : toolData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={toolData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {toolData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No tool data available
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-bold text-gray-900">Recent Activity</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-10 rounded" />
            ))}
          </div>
        ) : data?.recent_activity?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tool</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recent_activity.slice(0, 10).map((activity, i) => (
                  <tr key={i} className={`${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-800">
                      {activity.teacher_name || '-'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                        {(activity.tool || activity.tool_used || '-').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 max-w-xs truncate">
                      {activity.topic || '-'}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                      {formatTimeAgo(activity.created_at || activity.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400 text-sm">No recent activity</div>
        )}
      </motion.div>
    </div>
  );
}
