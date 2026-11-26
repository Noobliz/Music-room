import { z } from 'zod';

export const VOTE_ZONE_MIN_RADIUS_METERS = 10;
export const VOTE_ZONE_MAX_RADIUS_METERS = 50_000;

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const TIME_ZONE_NAME = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)*$/;

const latitudeSchema = z.number().finite().min(-90).max(90).describe('Decimal degrees, WGS 84');
const longitudeSchema = z
  .number()
  .finite()
  .min(-180)
  .max(180)
  .describe('Decimal degrees, WGS 84');

const canonicalTimeZone = (timeZone: string): string | undefined => {
  if (!TIME_ZONE_NAME.test(timeZone)) return undefined;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

const localDateTimeSchema = z
  .string()
  .regex(LOCAL_DATE_TIME, 'Expected a local date and time such as 2026-12-31T16:00')
  .datetime({ local: true })
  .transform((value) => (value.length === 16 ? `${value}:00` : value));

const timeZoneSchema = z
  .string()
  .transform((value, context) => {
    const timeZone = canonicalTimeZone(value);
    if (!timeZone) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Unknown IANA time zone' });
      return z.NEVER;
    }
    return timeZone;
  })
  .describe('IANA time zone of the event, such as Europe/Paris');

export const positionSchema = z
  .object({ latitude: latitudeSchema, longitude: longitudeSchema })
  .strict()
  .describe('Current GPS position of the device');

const voteZoneFields = {
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  radiusMeters: z
    .number()
    .int()
    .min(VOTE_ZONE_MIN_RADIUS_METERS)
    .max(VOTE_ZONE_MAX_RADIUS_METERS)
    .describe('Distance from the point within which users can vote'),
};

export const voteZoneInputSchema = z
  .object({
    ...voteZoneFields,
    startsAt: localDateTimeSchema.describe(
      'Start of the voting slot, local time of the event without offset (2026-12-31T16:00)',
    ),
    endsAt: localDateTimeSchema.describe('End of the voting slot, local time of the event'),
    timeZone: timeZoneSchema,
  })
  .strict()
  .refine(({ startsAt, endsAt }) => endsAt > startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  })
  .describe('Place and time slot where voting is allowed, required by the location_time mode');

export const voteZoneSchema = z
  .object({
    ...voteZoneFields,
    startsAt: z.string().describe('Local time of the event, such as 2026-12-31T16:00:00'),
    endsAt: z.string().describe('Local time of the event'),
    timeZone: z.string(),
  })
  .describe('Place and time slot where voting is allowed');

export type Position = z.infer<typeof positionSchema>;
export type VoteZoneInput = z.infer<typeof voteZoneInputSchema>;
export type VoteZoneView = z.infer<typeof voteZoneSchema>;
