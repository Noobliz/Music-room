import { type Track } from '../db/schema.js';
import { AppError } from '../errors/app-error.js';
import { createSupabaseClient, createSupabaseClientAsUser } from '../lib/supabase.js';
import { findTrackById, searchTracks as searchTrackRows } from '../models/track.model.js';
import {
  type TrackPage,
  type TrackSearchQuery,
  type TrackStream,
  type TrackView,
} from '../schemas/track.schema.js';
import { type AuthContext } from './token.service.js';

export const TRACKS_BUCKET = 'tracks';
export const COVERS_BUCKET = 'covers';

const STREAM_URL_MARGIN_SECONDS = 10 * 60;
const STREAM_URL_MAX_SECONDS = 60 * 60;

const coverUrl = (coverPath: string | null): string | null =>
  coverPath === null
    ? null
    : createSupabaseClient().storage.from(COVERS_BUCKET).getPublicUrl(coverPath).data.publicUrl;

const toTrackView = (track: Track): TrackView => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  album: track.album,
  durationMs: track.durationMs,
  coverUrl: coverUrl(track.coverPath),
  license: track.license,
  attribution: track.attribution,
});

const requireTrack = async (id: string): Promise<Track> => {
  const track = await findTrackById(id);
  if (!track) {
    throw new AppError(404, 'TRACK_NOT_FOUND', `No track with id ${id}`);
  }
  return track;
};

const streamUrlLifetimeSeconds = (durationMs: number): number =>
  Math.min(Math.ceil(durationMs / 1000) + STREAM_URL_MARGIN_SECONDS, STREAM_URL_MAX_SECONDS);

export const searchTracks = async ({ q, limit, offset }: TrackSearchQuery): Promise<TrackPage> => {
  const { rows, total } = await searchTrackRows(q, limit, offset);
  return { items: rows.map(toTrackView), total, limit, offset };
};

export const getTrack = async (id: string): Promise<TrackView> =>
  toTrackView(await requireTrack(id));

export const getTrackStream = async (
  { accessToken }: AuthContext,
  id: string,
): Promise<TrackStream> => {
  const track = await requireTrack(id);
  const lifetime = streamUrlLifetimeSeconds(track.durationMs);
  const expiresAt = new Date(Date.now() + lifetime * 1000);
  const { data, error } = await createSupabaseClientAsUser(accessToken)
    .storage.from(TRACKS_BUCKET)
    .createSignedUrl(track.audioPath, lifetime);
  if (error) {
    throw error;
  }
  return { url: data.signedUrl, expiresAt: expiresAt.toISOString() };
};
