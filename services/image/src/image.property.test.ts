// Feature: lost-and-found-app, Property 6, Property 7
import * as fc from 'fast-check';
import request from 'supertest';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import app from './app';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('./s3', () => ({
  BUCKET: 'test-bucket',
  s3: {
    send: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail-data')),
  });
});

const { s3 } = require('./s3');

// ── Arbitraries ───────────────────────────────────────────────────────────────

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type ValidMime = (typeof VALID_MIME_TYPES)[number];

const MIME_TO_EXT: Record<ValidMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Generates a valid MIME type and a small fake image buffer for that type. */
const validImageArb = fc
  .constantFrom(...VALID_MIME_TYPES)
  .chain((mime: ValidMime) =>
    fc
      .uint8Array({ minLength: 4, maxLength: 64 })
      .map((bytes) => ({ mime, buffer: Buffer.from(bytes), ext: MIME_TO_EXT[mime] }))
  );

/**
 * Generates MIME types that are NOT one of the three accepted types.
 * Uses a broad set of realistic MIME strings plus arbitrary strings.
 */
const invalidMimeArb = fc
  .oneof(
    fc.constantFrom(
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      'image/avif',
      'image/heic',
      'text/plain',
      'text/html',
      'application/json',
      'application/pdf',
      'application/octet-stream',
      'video/mp4',
      'audio/mpeg',
    ),
    // Arbitrary type/subtype strings that are guaranteed not to be the valid set
    fc
      .tuple(
        fc.stringMatching(/^[a-z]{2,10}$/),
        fc.stringMatching(/^[a-z]{2,10}$/),
      )
      .map(([t, s]) => `${t}/${s}`)
      .filter((m) => !(VALID_MIME_TYPES as readonly string[]).includes(m)),
  )
  .filter((m) => !(VALID_MIME_TYPES as readonly string[]).includes(m));

// ── Property 6: Image upload round-trip ──────────────────────────────────────
/**
 * For any valid image file (JPEG, PNG, or WebP), uploading it must return 201
 * with non-empty originalUrl and thumbnailUrl.
 * Validates: Requirements 3.1
 */
describe('Property 6: Image upload round-trip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (s3.send as jest.Mock).mockResolvedValue({});
  });

  it('upload valid image returns 201 with non-empty originalUrl and thumbnailUrl', async () => {
    await fc.assert(
      fc.asyncProperty(validImageArb, async ({ mime, buffer, ext }) => {
        jest.clearAllMocks();
        (s3.send as jest.Mock).mockResolvedValue({});

        const res = await request(app)
          .post('/api/images/upload')
          .attach('image', buffer, { filename: `photo.${ext}`, contentType: mime });

        expect(res.status).toBe(201);

        // Both URLs must be non-empty strings
        expect(typeof res.body.originalUrl).toBe('string');
        expect(res.body.originalUrl.length).toBeGreaterThan(0);
        expect(typeof res.body.thumbnailUrl).toBe('string');
        expect(res.body.thumbnailUrl.length).toBeGreaterThan(0);

        // URLs must reference the correct path prefixes
        expect(res.body.originalUrl).toMatch(/originals\//);
        expect(res.body.thumbnailUrl).toMatch(/thumbnails\//);

        // URLs must use the correct file extension for the MIME type
        expect(res.body.originalUrl).toMatch(new RegExp(`\\.${ext}$`));
        expect(res.body.thumbnailUrl).toMatch(new RegExp(`\\.${ext}$`));

        // S3 must have been called exactly twice (original + thumbnail)
        expect((s3.send as jest.Mock).mock.calls).toHaveLength(2);
        const keys = (s3.send as jest.Mock).mock.calls.map(
          (c: unknown[]) => (c[0] as PutObjectCommand).input.Key ?? '',
        );
        expect(keys.some((k: string) => k.startsWith('originals/'))).toBe(true);
        expect(keys.some((k: string) => k.startsWith('thumbnails/'))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 7: Invalid image types are rejected ──────────────────────────────
/**
 * For any file with a MIME type other than JPEG, PNG, or WebP, the Image
 * Service must return 415 and store nothing (s3.send never called).
 * Validates: Requirements 3.2
 */
describe('Property 7: Invalid image types are rejected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (s3.send as jest.Mock).mockResolvedValue({});
  });

  it('non-JPEG/PNG/WebP MIME type returns 415 and nothing is stored', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidMimeArb,
        fc.uint8Array({ minLength: 4, maxLength: 64 }),
        async (mime, bytes) => {
          jest.clearAllMocks();

          const buffer = Buffer.from(bytes);
          const res = await request(app)
            .post('/api/images/upload')
            .attach('image', buffer, { filename: 'file.bin', contentType: mime });

          expect(res.status).toBe(415);
          expect(res.body).toEqual({ error: 'UNSUPPORTED_MEDIA_TYPE' });

          // S3 must never have been called
          expect((s3.send as jest.Mock).mock.calls).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
