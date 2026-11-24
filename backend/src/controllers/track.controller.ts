import { type FastifyRequest } from 'fastify';

import { type TrackIdParams, type TrackSearchQuery } from '../schemas/track.schema.js';
import * as trackService from '../services/track.service.js';

export const searchTracks = async (request: FastifyRequest<{ Querystring: TrackSearchQuery }>) => {
  return trackService.searchTracks(request.query);
};

export const getTrack = async (request: FastifyRequest<{ Params: TrackIdParams }>) => {
  return trackService.getTrack(request.params.id);
};

export const getTrackStream = async (request: FastifyRequest<{ Params: TrackIdParams }>) => {
  return trackService.getTrackStream(request.auth, request.params.id);
};
