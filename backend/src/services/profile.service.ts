import { randomUUID } from 'node:crypto';

import { type Profile } from '../db/schema.js';
import { AppError } from '../errors/app-error.js';
import { createSupabaseClient, createSupabaseClientAsUser } from '../lib/supabase.js';
import {
  areFriends,
  findProfileById,
  isUsernameTakenByOther,
  type ProfileChanges,
  updateProfile,
} from '../models/profile.model.js';
import { deleteUserById } from '../models/user.model.js';
import {
  AVATAR_CONTENT_TYPES,
  type AvatarContentType,
  type OwnProfile,
  type ProfileView,
  type UpdateProfileBody,
} from '../schemas/profile.schema.js';
import { type AuthContext } from './token.service.js';

const AVATAR_BUCKET = 'avatars';

const AVATAR_EXTENSIONS: Record<AvatarContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

const MATCHES_SIGNATURE: Record<AvatarContentType, (bytes: Buffer) => boolean> = {
  'image/jpeg': (bytes) => bytes.subarray(0, 3).equals(JPEG_SIGNATURE),
  'image/png': (bytes) => bytes.subarray(0, 8).equals(PNG_SIGNATURE),
  'image/webp': (bytes) =>
    bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
    bytes.subarray(8, 12).toString('latin1') === 'WEBP',
};

const PROFILE_FIELD_VISIBILITY = {
  username: 'public',
  avatarUrl: 'public',
  bio: 'friends',
} as const satisfies Partial<Record<keyof Profile, 'public' | 'friends'>>;

type VisibleField = keyof typeof PROFILE_FIELD_VISIBILITY;

const isUniqueViolation = (error: unknown): boolean => {
  const candidate = error as { code?: string; cause?: { code?: string } } | null;
  return candidate?.code === '23505' || candidate?.cause?.code === '23505';
};

const requireProfile = (profile: Profile | undefined, id: string): Profile => {
  if (!profile) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', `No profile with id ${id}`);
  }
  return profile;
};

const toOwnProfile = (profile: Profile, email: string): OwnProfile => ({
  id: profile.id,
  email,
  username: profile.username,
  avatarUrl: profile.avatarUrl,
  bio: profile.bio,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});

const toProfileView = (profile: Profile, canSeeFriendFields: boolean): ProfileView => {
  const view: Partial<Pick<Profile, VisibleField | 'id'>> = { id: profile.id };
  for (const field of Object.keys(PROFILE_FIELD_VISIBILITY) as VisibleField[]) {
    if (PROFILE_FIELD_VISIBILITY[field] === 'public' || canSeeFriendFields) {
      Object.assign(view, { [field]: profile[field] });
    }
  }
  return view as ProfileView;
};

const avatarStorage = (accessToken: string) =>
  createSupabaseClientAsUser(accessToken).storage.from(AVATAR_BUCKET);

const removeAvatarFiles = async (
  { userId, accessToken }: AuthContext,
  keepPath?: string,
): Promise<void> => {
  const storage = avatarStorage(accessToken);
  const { data: files, error } = await storage.list(userId, { limit: 100 });
  if (error) {
    throw error;
  }

  const paths = files.map((file) => `${userId}/${file.name}`).filter((path) => path !== keepPath);
  if (paths.length === 0) {
    return;
  }

  const { error: removeError } = await storage.remove(paths);
  if (removeError) {
    throw removeError;
  }
};

export const getOwnProfile = async ({ userId, email }: AuthContext): Promise<OwnProfile> => {
  return toOwnProfile(requireProfile(await findProfileById(userId), userId), email);
};

export const getProfile = async ({ userId }: AuthContext, id: string): Promise<ProfileView> => {
  const profile = requireProfile(await findProfileById(id), id);
  const canSeeFriendFields = id === userId || (await areFriends(userId, id));
  return toProfileView(profile, canSeeFriendFields);
};

const saveProfile = async (
  { userId, email }: AuthContext,
  changes: ProfileChanges,
): Promise<OwnProfile> => {
  try {
    return toOwnProfile(requireProfile(await updateProfile(userId, changes), userId), email);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'USERNAME_TAKEN', 'Username already taken');
    }
    throw error;
  }
};

export const updateOwnProfile = async (
  auth: AuthContext,
  { username, bio }: UpdateProfileBody,
): Promise<OwnProfile> => {
  if (username !== undefined && (await isUsernameTakenByOther(username, auth.userId))) {
    throw new AppError(409, 'USERNAME_TAKEN', 'Username already taken');
  }
  return saveProfile(auth, { username, bio });
};

const toAvatarContentType = (contentType: string | undefined): AvatarContentType => {
  const essence = contentType?.split(';')[0]?.trim().toLowerCase();
  const supported = AVATAR_CONTENT_TYPES.find((type) => type === essence);
  if (!supported) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Avatar must be a JPEG, PNG or WebP image');
  }
  return supported;
};

export const replaceAvatar = async (
  auth: AuthContext,
  contentTypeHeader: string | undefined,
  image: Buffer,
): Promise<OwnProfile> => {
  const contentType = toAvatarContentType(contentTypeHeader);
  if (!MATCHES_SIGNATURE[contentType](image)) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', `Body is not a valid ${contentType} image`);
  }

  const path = `${auth.userId}/${randomUUID()}.${AVATAR_EXTENSIONS[contentType]}`;
  const { error } = await avatarStorage(auth.accessToken).upload(path, image, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) {
    throw error;
  }

  const avatarUrl = createSupabaseClient().storage.from(AVATAR_BUCKET).getPublicUrl(path)
    .data.publicUrl;
  const profile = await saveProfile(auth, { avatarUrl });
  await removeAvatarFiles(auth, path).catch(() => undefined);
  return profile;
};

export const removeAvatar = async (auth: AuthContext): Promise<void> => {
  await saveProfile(auth, { avatarUrl: null });
  await removeAvatarFiles(auth);
};

export const deleteAccount = async (auth: AuthContext): Promise<void> => {
  await removeAvatarFiles(auth);
  await deleteUserById(auth.userId);
};
