import cors from 'cors';

export const corsConfig = cors({
  credentials: true,
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
  ],
  maxAge: 7200,
});
