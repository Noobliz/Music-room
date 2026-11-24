# Realtime protocol

The API pushes the changes of events and playlists (spaces) over one WebSocket per client. The client only **receives** through it: every write still goes through the REST routes described in Swagger (`/docs`).

## Connection

```
GET /realtime
Authorization: Bearer <accessToken>
Upgrade: websocket
```

- The access token is the one returned by `/auth/login` or `/auth/refresh`, checked like on every HTTP route (signature, expiry, active session).
- Without a valid token the upgrade is refused with HTTP `401` and the usual error body (`TOKEN_MISSING`, `TOKEN_INVALID` or `TOKEN_EXPIRED`).
- Messages are JSON text frames of 4 KiB at most.

## Client → server

```json
{ "type": "subscribe", "spaceId": "<uuid>" }
{ "type": "unsubscribe", "spaceId": "<uuid>" }
```

- `subscribe` applies the same rule as `GET /spaces/:id`: a public space, or a private one I own or am invited to. Otherwise the server answers with an `error` message with code `SPACE_NOT_FOUND`.
- Subscribing twice to the same space is harmless. `unsubscribe` gets no answer.
- One connection can subscribe to several spaces.

## Server → client

Every message has the same four fields:

| Field     | Type              | Meaning                               |
| --------- | ----------------- | ------------------------------------- |
| `type`    | string            | Event type, see below                 |
| `spaceId` | uuid or `null`    | Space concerned                       |
| `version` | integer or `null` | Version of the space after the change |
| `data`    | object or `null`  | Payload of the event                  |

| `type`                 | `data`                                                                     | When                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `subscribed`           | `null`                                                                     | Answer to `subscribe`. `version` is the current version of the space                                                                   |
| `space.updated`        | the space, same shape as `GET /spaces/:id` (with my `myRole` and `canAct`) | The owner changed the space, or my role in it changed (invited, invitation removed)                                                    |
| `space.deleted`        | `null`                                                                     | The owner deleted the space. The subscription ends                                                                                     |
| `space.access_revoked` | `null`                                                                     | I can no longer open the space (made private, invitation removed, friendship removed). The subscription ends                           |
| `error`                | `{ "code": "...", "message": "..." }`                                      | The last client message was rejected: `VALIDATION_ERROR` (malformed message), `SPACE_NOT_FOUND`, `INTERNAL_ERROR`. `version` is `null` |

Track Vote (votes, queue, current track) and Playlist Editor (add, remove, move) will add their own types to this list, with the same envelope.

## Versions

Each space has a `version` (also returned by the REST routes of the space) that increases with every change to its shared state. For an event of a space whose local copy has version `known`:

- `version < known`: stale event, ignore it.
- `version == known` or `version == known + 1`: apply it. `space.updated` carries the whole space and replaces the local copy.
- `version > known + 1`: events were missed. Reload the space with REST.

## Keep-alive and reconnection

- The server sends a WebSocket ping every 30 s. Clients answer with a pong automatically (OkHttp does). A connection that missed one pong is closed.
- At the same time the server checks the session. When the access token has expired or the user logged out, it closes the socket with code **`4401`** and reason `TOKEN_EXPIRED` or `TOKEN_INVALID`. Refresh the token with `/auth/refresh` and reconnect.
- After any disconnection (network loss, `4401`, server restart):
  1. reconnect with a valid token;
  2. reload each open space with REST (`GET /spaces/:id`, and later the service routes);
  3. send `subscribe` again for each of them;
  4. if the `version` of `subscribed` is greater than the one loaded, reload once more.

Subscriptions do not survive a reconnection.

## Example

```text
→ {"type":"subscribe","spaceId":"6d1f…"}
← {"type":"subscribed","spaceId":"6d1f…","version":3,"data":null}
   (the owner renames the playlist with PATCH /spaces/6d1f…)
← {"type":"space.updated","spaceId":"6d1f…","version":4,"data":{"id":"6d1f…","name":"Road trip","myRole":"invited","canAct":true,"version":4,…}}
   (the owner removes my invitation from a private playlist)
← {"type":"space.access_revoked","spaceId":"6d1f…","version":4,"data":null}
```
