import { type HealthResponse } from '../schemas/health.schema.js';

export const getHealth = async (): Promise<HealthResponse> => {
  return { status: 'ok' };
};
