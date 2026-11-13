import { z } from 'zod';

import { friendUserSchema } from './friend.schema.js';

export const SPACE_SEARCH_DEFAULT_LIMIT = 20;
export const SPACE_SEARCH_MAX_LIMIT = 50;

export const SPACE_KINDS = ['event', 'playlist'] as const;
export const SPACE_VISIBILITIES = ['public', 'private'] as const;
export const SPACE_ACCESS_MODES = ['everyone', 'invited_only'] as const;
export const SPACE_ROLES = ['owner', 'invited', 'none'] as const;

const spaceKindSchema = z
  .enum(SPACE_KINDS)
  .describe('event for Track Vote, playlist for Playlist Editor');

const spaceVisibilitySchema = z
  .enum(SPACE_VISIBILITIES)
  .describe('public: anyone can find and open it; private: only the owner and invited users');

const spaceAccessModeSchema = z
  .enum(SPACE_ACCESS_MODES)
  .describe(
    'everyone: anyone who can open the space can act in it; invited_only: only the owner and invited users can act',
  );

const spaceNameSchema = z.string().trim().min(1).max(100);

const spaceDescriptionSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .transform((description) => (description === '' ? null : description))
  .describe('500 characters at most; null or "" clears it');

export const spaceUserSchema = friendUserSchema.describe('Public fields of a user');

export const spaceSchema = z
  .object({
    id: z.string().uuid(),
    kind: spaceKindSchema,
    name: z.string(),
    description: z.string().nullable(),
    visibility: spaceVisibilitySchema,
    accessMode: spaceAccessModeSchema,
    owner: spaceUserSchema,
    myRole: z
      .enum(SPACE_ROLES)
      .describe('owner, invited, or none when I neither own nor was invited to the space'),
    canAct: z
      .boolean()
      .describe('Whether I can act in the space (vote, propose, edit the playlist...)'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .describe('Event or playlist, as seen by the authenticated user');

export const spacePageSchema = z
  .object({
    items: z.array(spaceSchema),
    total: z.number().int().nonnegative().describe('Number of spaces matching the search'),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  })
  .describe('One page of public spaces');

export const createSpaceBodySchema = z
  .object({
    kind: spaceKindSchema,
    name: spaceNameSchema,
    description: spaceDescriptionSchema.optional(),
    visibility: spaceVisibilitySchema.default('public'),
    accessMode: spaceAccessModeSchema.default('everyone'),
  })
  .strict();

export const updateSpaceBodySchema = z
  .object({
    name: spaceNameSchema.optional(),
    description: spaceDescriptionSchema.optional(),
    visibility: spaceVisibilitySchema.optional(),
    accessMode: spaceAccessModeSchema.optional(),
  })
  .strict()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

export const spaceSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Part of the name, case-insensitive. Omit to browse the most recent spaces'),
  kind: spaceKindSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SPACE_SEARCH_MAX_LIMIT)
    .default(SPACE_SEARCH_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export const mySpacesQuerySchema = z.object({
  kind: spaceKindSchema.optional(),
});

export const spaceIdParamsSchema = z.object({
  id: z.string().uuid().describe('Space id'),
});

export const spaceInvitationParamsSchema = spaceIdParamsSchema.extend({
  userId: z.string().uuid().describe('Id of the invited user'),
});

export const spaceInvitationSchema = z
  .object({
    user: spaceUserSchema,
    invitedAt: z.string().datetime(),
  })
  .describe('User invited to a space');

export const inviteToSpaceBodySchema = z
  .object({
    userId: z.string().uuid().describe('Friend to invite'),
  })
  .strict();

export type SpaceKind = (typeof SPACE_KINDS)[number];
export type SpaceRole = (typeof SPACE_ROLES)[number];
export type SpaceUser = z.infer<typeof spaceUserSchema>;
export type SpaceView = z.infer<typeof spaceSchema>;
export type SpacePage = z.infer<typeof spacePageSchema>;
export type SpaceInvitationView = z.infer<typeof spaceInvitationSchema>;
export type CreateSpaceBody = z.infer<typeof createSpaceBodySchema>;
export type UpdateSpaceBody = z.infer<typeof updateSpaceBodySchema>;
export type SpaceSearchQuery = z.infer<typeof spaceSearchQuerySchema>;
export type MySpacesQuery = z.infer<typeof mySpacesQuerySchema>;
export type SpaceIdParams = z.infer<typeof spaceIdParamsSchema>;
export type SpaceInvitationParams = z.infer<typeof spaceInvitationParamsSchema>;
export type InviteToSpaceBody = z.infer<typeof inviteToSpaceBodySchema>;
