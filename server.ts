import express from 'express';
import searchRoutes from './routes/search';
import cors from 'cors';
import mongoose from 'mongoose';
import session from 'express-session';
import config from './config';
import userRoutes from './routes/users';
import videoRoutes from './routes/videos';
import { User, UserDocument } from './models/schemas';
import path from 'path';

declare module 'express-session' {
  interface SessionData {
    user?: UserDocument;
    accessToken?: string;
  }
}

const app = express();

// Connect to MongoDB
mongoose.connect(config.mongodb.uri, {
  user: config.mongodb.username,
  pass: config.mongodb.password,
  dbName: 'piclips'
})
.then(() => {
  console.log('Connected to MongoDB');
  console.log('Database:', mongoose.connection.db?.databaseName || 'Unknown');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser configuration with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ensure session secret is set
if (!config.sessionSecret) {
  console.error('SESSION_SECRET is not set in the environment variables');
  process.exit(1);
}

// Session configuration
app.use(
  (session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  }) as unknown) as express.RequestHandler
);

// Increase timeout for requests
app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    console.log('Request has timed out.');
    res.status(408).send('Request has timed out.');
  });
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
// Add the search route to your Express app
app.use('/api/search', searchRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;























































