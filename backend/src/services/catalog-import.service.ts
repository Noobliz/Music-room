import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import { type SupabaseClient } from '@supabase/supabase-js';
import { parseBuffer, selectCover } from 'music-metadata';
import { z } from 'zod';

import { createSupabaseAdminClient } from '../lib/supabase.js';
import { findTrackIdByContentHash, upsertTrack } from '../models/track.model.js';
import { COVERS_BUCKET, TRACKS_BUCKET } from './track.service.js';

export const CATALOG_MANIFEST = 'catalog.json';

const UNKNOWN_ARTIST = 'Unknown artist';

const COVER_EXTENSIONS = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
} as const satisfies Record<string, string>;

type CoverContentType = (typeof COVER_EXTENSIONS)[keyof typeof COVER_EXTENSIONS];

const COVER_FILE_EXTENSIONS: Record<CoverContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const optionalText = z.string().trim().min(1).optional();

const manifestSchema = z.record(
  z.string(),
  z
    .object({
      title: optionalText,
      artist: optionalText,
      album: optionalText,
      license: optionalText,
      attribution: optionalText,
      cover: optionalText.describe('Image file of the catalog folder to use as cover'),
    })
    .strict(),
);

type ManifestEntry = z.infer<typeof manifestSchema>[string];

type Cover = { data: Uint8Array; contentType: CoverContentType };

type Storage = SupabaseClient['storage'];

export type CatalogImportReport = {
  imported: string[];
  updated: string[];
  failed: { file: string; reason: string }[];
};

const sha256 = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const toCoverContentType = (value: string | undefined): CoverContentType | undefined => {
  const normalized = value?.toLowerCase();
  return Object.values(COVER_EXTENSIONS).find((type) => type === normalized);
};

const coverContentTypeOf = (file: string): CoverContentType | undefined =>
  COVER_EXTENSIONS[extname(file).toLowerCase() as keyof typeof COVER_EXTENSIONS];

const readManifest = async (directory: string): Promise<Record<string, ManifestEntry>> => {
  try {
    const raw = await readFile(join(directory, CATALOG_MANIFEST), 'utf8');
    return manifestSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isMissing(error)) {
      return {};
    }
    throw new Error(`Invalid ${CATALOG_MANIFEST}: ${(error as Error).message}`);
  }
};

const readCoverFile = async (directory: string, file: string): Promise<Cover> => {
  const contentType = coverContentTypeOf(file);
  if (!contentType) {
    throw new Error(`Cover ${file} must be a JPEG, PNG or WebP image`);
  }
  return { data: await readFile(join(directory, file)), contentType };
};

const findCover = async (
  directory: string,
  files: string[],
  audioFile: string,
  entry: ManifestEntry | undefined,
  embedded: Cover | undefined,
): Promise<Cover | undefined> => {
  if (entry?.cover) {
    return readCoverFile(directory, entry.cover);
  }
  const stem = basename(audioFile, extname(audioFile));
  const sibling = files.find(
    (file) => basename(file, extname(file)) === stem && coverContentTypeOf(file) !== undefined,
  );
  return sibling ? readCoverFile(directory, sibling) : embedded;
};

const upload = async (
  storage: Storage,
  bucket: string,
  path: string,
  data: Uint8Array,
  contentType: string,
): Promise<void> => {
  const { error } = await storage
    .from(bucket)
    .upload(path, data, { contentType, cacheControl: '31536000', upsert: true });
  if (error) {
    throw error;
  }
};

const uploadCover = async (storage: Storage, cover: Cover): Promise<string> => {
  const path = `${sha256(cover.data)}.${COVER_FILE_EXTENSIONS[cover.contentType]}`;
  await upload(storage, COVERS_BUCKET, path, cover.data, cover.contentType);
  return path;
};

const importTrack = async (
  storage: Storage,
  directory: string,
  files: string[],
  file: string,
  entry: ManifestEntry | undefined,
): Promise<boolean> => {
  const audio = await readFile(join(directory, file));
  const metadata = await parseBuffer(
    audio,
    { mimeType: 'audio/mpeg', size: audio.length },
    { duration: true },
  );
  const durationMs = Math.round((metadata.format.duration ?? 0) * 1000);
  if (durationMs <= 0) {
    throw new Error('Duration could not be read');
  }

  const picture = selectCover(metadata.common.picture);
  const pictureType = toCoverContentType(picture?.format);
  const embedded =
    picture && pictureType ? { data: picture.data, contentType: pictureType } : undefined;
  const cover = await findCover(directory, files, file, entry, embedded);

  const contentHash = sha256(audio);
  const audioPath = `${contentHash}.mp3`;
  if (!(await findTrackIdByContentHash(contentHash))) {
    await upload(storage, TRACKS_BUCKET, audioPath, audio, 'audio/mpeg');
  }

  const { inserted } = await upsertTrack({
    title: entry?.title ?? (metadata.common.title?.trim() || basename(file, extname(file))),
    artist:
      entry?.artist ??
      (metadata.common.artist?.trim() || metadata.common.albumartist?.trim() || UNKNOWN_ARTIST),
    album: entry?.album ?? (metadata.common.album?.trim() || null),
    durationMs,
    audioPath,
    coverPath: cover ? await uploadCover(storage, cover) : null,
    contentHash,
    license: entry?.license ?? null,
    attribution: entry?.attribution ?? null,
  });
  return inserted;
};

export const importCatalog = async (directory: string): Promise<CatalogImportReport> => {
  const report: CatalogImportReport = { imported: [], updated: [], failed: [] };
  const files = (await readdir(directory)).sort();
  const manifest = await readManifest(directory);
  const storage = createSupabaseAdminClient().storage;
  const audioFiles = files.filter((file) => extname(file).toLowerCase() === '.mp3');

  for (const file of audioFiles) {
    try {
      const inserted = await importTrack(storage, directory, files, file, manifest[file]);
      (inserted ? report.imported : report.updated).push(file);
    } catch (error) {
      report.failed.push({ file, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return report;
};
