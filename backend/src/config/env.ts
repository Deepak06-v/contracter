import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  CLIENT_URL: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  STORAGE_PROVIDER: 'local' | 'cloudinary';
  UPLOAD_DIR: string;
  MAX_UPLOAD_SIZE_MB: number;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  DEMO_SEED_ENABLED: boolean;
  DEMO_CONTRACTOR_EMAIL: string;
  DEMO_CONTRACTOR_PASSWORD: string;
  DEMO_AGENT_EMAIL: string;
  DEMO_AGENT_PASSWORD: string;
}

export function validateEnv(): AppConfig {
  const missing: string[] = [];

  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[Startup Error] Missing required environment variables: ${missing.join(', ')}. Please check your .env file or refer to .env.example.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const storageProvider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase() as 'local' | 'cloudinary';
  if (storageProvider === 'cloudinary') {
    const cloudMissing: string[] = [];
    if (!process.env.CLOUDINARY_CLOUD_NAME) cloudMissing.push('CLOUDINARY_CLOUD_NAME');
    if (!process.env.CLOUDINARY_API_KEY) cloudMissing.push('CLOUDINARY_API_KEY');
    if (!process.env.CLOUDINARY_API_SECRET) cloudMissing.push('CLOUDINARY_API_SECRET');

    if (cloudMissing.length > 0) {
      const errorMsg = `[Startup Error] STORAGE_PROVIDER is set to 'cloudinary' but missing credentials: ${cloudMissing.join(', ')}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    MONGODB_URI: process.env.MONGODB_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    STORAGE_PROVIDER: storageProvider,
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
    MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '8', 10),
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    DEMO_SEED_ENABLED: process.env.DEMO_SEED_ENABLED === 'true',
    DEMO_CONTRACTOR_EMAIL: process.env.DEMO_CONTRACTOR_EMAIL || 'contractor@example.com',
    DEMO_CONTRACTOR_PASSWORD: process.env.DEMO_CONTRACTOR_PASSWORD || 'Contractor@123',
    DEMO_AGENT_EMAIL: process.env.DEMO_AGENT_EMAIL || 'agent@example.com',
    DEMO_AGENT_PASSWORD: process.env.DEMO_AGENT_PASSWORD || 'Agent@123',
  };
}

export const env = validateEnv();
