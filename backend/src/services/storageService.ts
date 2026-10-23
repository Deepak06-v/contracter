import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { IProofPhoto } from '../models/Transaction';

// Setup Cloudinary if configured
if (env.STORAGE_PROVIDER === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// Ensure local upload directory exists
const uploadAbsolutePath = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadAbsolutePath)) {
  fs.mkdirSync(uploadAbsolutePath, { recursive: true });
}

export interface UploadedFileMeta {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
  filename?: string;
}

export class StorageService {
  /**
   * Save uploaded file either to local storage or Cloudinary.
   */
  static async saveFile(file: Express.Multer.File): Promise<IProofPhoto> {
    const isCloudinary = env.STORAGE_PROVIDER === 'cloudinary';

    if (isCloudinary) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'construction_ledger_proofs',
            resource_type: 'image',
          },
          (error, result) => {
            if (error || !result) {
              return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
            }
            resolve({
              storage: 'cloudinary',
              filename: result.public_id,
              originalName: file.originalname,
              path: result.secure_url,
              mimetype: file.mimetype,
              size: file.size,
            });
          }
        );

        if (file.buffer) {
          uploadStream.end(file.buffer);
        } else if (file.path) {
          const readStream = fs.createReadStream(file.path);
          readStream.pipe(uploadStream);
          // Delete temp file after streaming
          uploadStream.on('finish', () => {
            fs.unlink(file.path, () => {});
          });
        } else {
          reject(new Error('File buffer or path not found'));
        }
      });
    }

    // Local Storage:
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const targetPath = path.join(uploadAbsolutePath, uniqueFilename);

    if (file.buffer) {
      await fs.promises.writeFile(targetPath, file.buffer);
    } else if (file.path) {
      await fs.promises.rename(file.path, targetPath);
    } else {
      throw new Error('File data is missing');
    }

    return {
      storage: 'local',
      filename: uniqueFilename,
      originalName: file.originalname,
      path: uniqueFilename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Get physical file stream/path for local storage.
   */
  static getLocalFilePath(filename: string): string | null {
    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(filename);
    const fullPath = path.join(uploadAbsolutePath, safeFilename);

    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }

  /**
   * Delete proof photo from disk or Cloudinary.
   */
  static async deleteFile(photo: IProofPhoto): Promise<void> {
    try {
      if (photo.storage === 'cloudinary') {
        await cloudinary.uploader.destroy(photo.filename);
      } else {
        const safeFilename = path.basename(photo.path);
        const fullPath = path.join(uploadAbsolutePath, safeFilename);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      }
    } catch (err: any) {
      console.warn(`[Storage Warning] Failed to delete file ${photo.filename}: ${err.message}`);
    }
  }
}
