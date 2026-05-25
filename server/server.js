import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import sessionRoutes from './routes/sessions.js';
import curriculumRoutes from './routes/curriculum.js';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/api/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tutor')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/curriculum', curriculumRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
