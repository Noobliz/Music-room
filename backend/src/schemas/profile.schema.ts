import { z } from 'zod';

import { usernameSchema } from './auth.schema.js';

export const AVATAR_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 50 * 1024 * 1024;

export type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[number];

export const MUSIC_GENRES = [
  'pop',
  'rock',
  'hip_hop',
  'rnb',
  'electronic',
  'jazz',
  'classical',
  'metal',
  'folk',
  'reggae',
  'blues',
  'country',
  'soul',
  'latin',
  'world',
] as const;

const MIN_BIRTH_DATE = '1900-01-01';

const bioSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .transform((bio) => (bio === '' ? null : bio))
  .describe('Bio visible to friends, 500 characters at most; null or "" clears it');

const musicGenresSchema = z
  .array(z.enum(MUSIC_GENRES))
  .max(MUSIC_GENRES.length)
  .transform((genres) => [...new Set(genres)])
  .describe('Favorite music genres, visible to friends; [] clears them');

const fullNameSchema = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .transform((name) => (name === '' ? null : name))
  .describe('Real name, private, 100 characters at most; null or "" clears it');

const birthDateSchema = z
  .string()
  .date()
  .refine(
    (date) => date >= MIN_BIRTH_DATE && date <= new Date().toISOString().slice(0, 10),
    `Birth date must be between ${MIN_BIRTH_DATE} and today`,
  )
  .nullable()
  .describe('Birth date (YYYY-MM-DD), private; null clears it');

const avatarUrlSchema = z.string().url().nullable().describe('Public URL of the avatar image');

export const profileIdParamsSchema = z.object({
  id: z.string().uuid().describe('Profile id, same as the user id'),
});

export const updateProfileBodySchema = z
  .object({
    username: usernameSchema.optional(),
    bio: bioSchema.optional(),
    musicGenres: musicGenresSchema.optional(),
    fullName: fullNameSchema.optional(),
    birthDate: birthDateSchema.optional(),
  })
  .strict()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

export const avatarBodySchema = z
  .custom<Buffer>((body) => Buffer.isBuffer(body), 'Body must be the raw image bytes')
  .describe('Raw bytes of a JPEG, PNG or WebP image, 50 MiB at most');

export const ownProfileSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().describe('Private, only visible to its owner'),
    username: z.string(),
    avatarUrl: avatarUrlSchema,
    bio: z.string().nullable(),
    musicGenres: z.array(z.enum(MUSIC_GENRES)),
    fullName: z.string().nullable().describe('Private, only visible to its owner'),
    birthDate: z.string().date().nullable().describe('Private, only visible to its owner'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .describe('Full profile of the authenticated user');

export const profileSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string(),
    avatarUrl: avatarUrlSchema,
    bio: z
      .string()
      .nullable()
      .optional()
      .describe('Only present when the viewer is a friend or the owner'),
    musicGenres: z
      .array(z.enum(MUSIC_GENRES))
      .optional()
      .describe('Only present when the viewer is a friend or the owner'),
  })
  .describe('Profile as seen by another user: public fields, plus friend-only fields for friends');

export type ProfileIdParams = z.infer<typeof profileIdParamsSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type OwnProfile = z.infer<typeof ownProfileSchema>;
export type ProfileView = z.infer<typeof profileSchema>;
