import request from 'supertest';
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import app from '../app';

// Mock the S3 client
jest.mock('../s3', () => ({
  BUCKET: 'test-bucket',
  s3: {
    send: jest.fn().mockResolvedValue({}),
  },
}));

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail-data')),
  });
});

const { s3 } = require('../s3');

function makeImageBuffer(type: 'jpeg' | 'png' | 'webp' = 'jpeg'): Buffer {
  // Minimal valid-ish buffer — just needs to be non-empty for the mock
  return Buffer.from(`fake-${type}-data`);
}

describe('POST /api/images/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (s3.send as jest.Mock).mockResolvedValue({});
  });

  it('returns 201 with originalUrl and thumbnailUrl for a valid JPEG', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', makeImageBuffer('jpeg'), { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('originalUrl');
    expect(res.body).toHaveProperty('thumbnailUrl');
    expect(res.body.originalUrl).toMatch(/originals\/.+\.jpg/);
    expect(res.body.thumbnailUrl).toMatch(/thumbnails\/.+\.jpg/);
  });

  it('returns 201 for a valid PNG', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', makeImageBuffer('png'), { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.originalUrl).toMatch(/\.png$/);
    expect(res.body.thumbnailUrl).toMatch(/\.png$/);
  });

  it('returns 201 for a valid WebP', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', makeImageBuffer('webp'), { filename: 'photo.webp', contentType: 'image/webp' });

    expect(res.status).toBe(201);
    expect(res.body.originalUrl).toMatch(/\.webp$/);
  });

  it('uploads both original and thumbnail to S3', async () => {
    await request(app)
      .post('/api/images/upload')
      .attach('image', makeImageBuffer('jpeg'), { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(s3.send).toHaveBeenCalledTimes(2);
    const calls = (s3.send as jest.Mock).mock.calls;
    const keys = calls.map((c: any[]) => (c[0] as PutObjectCommand).input.Key ?? '');
    expect(keys.some((k: string) => k.startsWith('originals/'))).toBe(true);
    expect(keys.some((k: string) => k.startsWith('thumbnails/'))).toBe(true);
  });

  it('returns 415 for an unsupported MIME type (GIF)', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', Buffer.from('fake-gif'), { filename: 'anim.gif', contentType: 'image/gif' });

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'UNSUPPORTED_MEDIA_TYPE' });
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('returns 415 for a text/plain file', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', Buffer.from('hello'), { filename: 'file.txt', contentType: 'text/plain' });

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/images/upload');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('DELETE /api/images/:imageId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 204 and deletes both original and thumbnail when both exist', async () => {
    // HeadObject resolves (exists) for both keys
    (s3.send as jest.Mock).mockResolvedValue({});

    const res = await request(app).delete('/api/images/abc123.jpg');

    expect(res.status).toBe(204);
    // 2 HeadObject + 2 DeleteObject = 4 calls
    expect(s3.send).toHaveBeenCalledTimes(4);
    const calls = (s3.send as jest.Mock).mock.calls;
    const deleteKeys = calls
      .filter((c: any[]) => c[0] instanceof DeleteObjectCommand)
      .map((c: any[]) => (c[0] as DeleteObjectCommand).input.Key);
    expect(deleteKeys).toContain('originals/abc123.jpg');
    expect(deleteKeys).toContain('thumbnails/abc123.jpg');
  });

  it('returns 204 when only the original exists', async () => {
    (s3.send as jest.Mock).mockImplementation((cmd: any) => {
      if (cmd instanceof HeadObjectCommand) {
        if (cmd.input.Key?.startsWith('originals/')) return Promise.resolve({});
        return Promise.reject(Object.assign(new Error('NotFound'), { name: 'NotFound' }));
      }
      return Promise.resolve({});
    });

    const res = await request(app).delete('/api/images/abc123.jpg');

    expect(res.status).toBe(204);
    const calls = (s3.send as jest.Mock).mock.calls;
    const deleteKeys = calls
      .filter((c: any[]) => c[0] instanceof DeleteObjectCommand)
      .map((c: any[]) => (c[0] as DeleteObjectCommand).input.Key);
    expect(deleteKeys).toContain('originals/abc123.jpg');
    expect(deleteKeys).not.toContain('thumbnails/abc123.jpg');
  });

  it('returns 404 when neither original nor thumbnail exists', async () => {
    (s3.send as jest.Mock).mockRejectedValue(
      Object.assign(new Error('NotFound'), { name: 'NotFound' })
    );

    const res = await request(app).delete('/api/images/nonexistent.jpg');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NOT_FOUND' });
    // No DeleteObject calls should have been made
    const calls = (s3.send as jest.Mock).mock.calls;
    const deleteCalls = calls.filter((c: any[]) => c[0] instanceof DeleteObjectCommand);
    expect(deleteCalls).toHaveLength(0);
  });
});
