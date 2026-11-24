import { type FastifyPluginAsyncZod, jsonSchemaTransform } from 'fastify-type-provider-zod';
import { z } from 'zod';

import * as realtimeController from '../controllers/realtime.controller.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

const description = `
Opens the WebSocket that pushes the changes of the spaces I subscribe to. The client only **receives** through it: every write still goes through the REST routes. Swagger UI cannot open a WebSocket, so *Try it out* only shows the 401 and 404 answers. Full reference with examples: \`docs/realtime.md\`.

### Connection

\`\`\`
GET /realtime
Authorization: Bearer ACCESS_TOKEN
Upgrade: websocket
\`\`\`

The access token is checked like on every HTTP route (signature, expiry, active session). Messages are JSON text frames of 4 KiB at most.

### Client → server

\`\`\`json
{ "type": "subscribe", "spaceId": "uuid" }
{ "type": "unsubscribe", "spaceId": "uuid" }
\`\`\`

\`subscribe\` follows the rule of \`GET /spaces/{id}\`: a public space, or a private one I own or am invited to. One connection can subscribe to several spaces. \`unsubscribe\` gets no answer.

### Server → client

Every message is \`{ "type", "spaceId", "version", "data" }\`.

| type | data | when |
| --- | --- | --- |
| \`subscribed\` | \`null\` | Answer to \`subscribe\`, with the current version of the space |
| \`space.updated\` | the space, as \`GET /spaces/{id}\` returns it for me | The owner changed the space, or my role in it changed |
| \`space.deleted\` | \`null\` | The owner deleted the space. The subscription ends |
| \`space.access_revoked\` | \`null\` | I can no longer open the space. The subscription ends |
| \`error\` | \`{ "code", "message" }\` | The last client message was rejected: \`VALIDATION_ERROR\`, \`SPACE_NOT_FOUND\` or \`INTERNAL_ERROR\`. \`version\` is \`null\` |

### Versions

For a space whose local copy has version \`known\`: ignore an event with \`version < known\`, apply it when \`version\` is \`known\` or \`known + 1\`, reload the space with REST when \`version > known + 1\`.

### Keep-alive and reconnection

The server pings every 30 s and closes a connection that missed one pong. When the access token expires or the user logs out, it closes the socket with code **4401** and reason \`TOKEN_EXPIRED\` or \`TOKEN_INVALID\`.

After any disconnection: reconnect with a valid token, reload each open space with REST, then send \`subscribe\` again. Subscriptions do not survive a reconnection.
`;

export const realtimeRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/',
    {
      websocket: true,
      schema: {
        tags: ['realtime'],
        summary: 'Open the realtime WebSocket',
        description,
        security: [{ bearerAuth: [] }],
        response: {
          101: z.null().describe('Switching Protocols: the WebSocket is open'),
          401: errorResponseSchema.describe('TOKEN_MISSING, TOKEN_INVALID or TOKEN_EXPIRED'),
          404: z.null().describe('The request has no "Upgrade: websocket" header'),
        },
      },
      config: {
        swaggerTransform: (transform) =>
          jsonSchemaTransform({ ...transform, schema: { ...transform.schema, hide: false } }),
      },
      onRequest: [server.authenticate],
    },
    realtimeController.openConnection,
  );
};
