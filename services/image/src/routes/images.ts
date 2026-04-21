import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { s3, BUCKET } from '../s3';

const router = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('UNSUPPORTED_MEDIA_TYPE'));
    }
  },
});

function buildUrl(key: string): string {
  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint) {
    // LocalStack path-style: <endpoint>/<bucket>/<key>
    return `${endpoint.replace(/\/$/, '')}/${BUCKET}/${key}`;
  }
  // Real AWS virtual-hosted style
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

router.post(
  '/upload',
  (req: Request, res: Response, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.message === 'UNSUPPORTED_MEDIA_TYPE') {
          return res.status(415).json({ error: 'UNSUPPORTED_MEDIA_TYPE' });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
        }
        return next(err);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'NO_FILE' });
    }

    const { mimetype, buffer } = req.file;
    const ext = MIME_TO_EXT[mimetype] || 'jpg';
    const id = uuidv4();

    const originalKey = `originals/${id}.${ext}`;
    const thumbnailKey = `thumbnails/${id}.${ext}`;

    // Generate thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .toBuffer();

    // Upload original
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: originalKey,
        Body: buffer,
        ContentType: mimetype,
      })
    );

    // Upload thumbnail
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: mimetype,
      })
    );

    return res.status(201).json({
      originalUrl: buildUrl(originalKey),
      thumbnailUrl: buildUrl(thumbnailKey),
    });
  }
);

router.delete('/:imageId', async (req: Request, res: Response) => {
  const { imageId } = req.params;
  const originalKey = `originals/${imageId}`;
  const thumbnailKey = `thumbnails/${imageId}`;

  // Check if at least one object exists
  const exists = async (key: string): Promise<boolean> => {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      return true;
    } catch {
      return false;
    }
  };

  const [originalExists, thumbnailExists] = await Promise.all([
    exists(originalKey),
    exists(thumbnailKey),
  ]);

  if (!originalExists && !thumbnailExists) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  await Promise.all([
    originalExists
      ? s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: originalKey }))
      : Promise.resolve(),
    thumbnailExists
      ? s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: thumbnailKey }))
      : Promise.resolve(),
  ]);

  return res.status(204).send();
});

export default router;
