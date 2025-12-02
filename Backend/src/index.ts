import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import canvasRoutes from './routes/canvas'

dotenv.config();

const app = express();
const PORT = process.env.PORT || '3002';

app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/process', canvasRoutes)

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
