import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error Handler]', err);

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'File is too large. Maximum allowed size is 8MB.' });
      return;
    }
    res.status(400).json({ message: `Upload error: ${err.message}` });
    return;
  }

  // Handle file filter custom error
  if (err.message && err.message.includes('Invalid file type')) {
    res.status(400).json({ message: err.message });
    return;
  }

  // Handle Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({ message: `Invalid resource identifier: ${err.value}` });
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    res.status(400).json({ message: messages.join(', ') });
    return;
  }

  // Handle duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    res.status(400).json({ message: `A record with this ${field} already exists.` });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ message });
}
