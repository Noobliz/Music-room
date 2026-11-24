const loadWebSocket = () => {
  try {
    return require('ws');
  } catch (error) {
    if (typeof bru !== 'undefined' && bru.isSafeMode()) {
      throw new Error(
        'The realtime scenario needs Developer Mode: click the shield icon of the collection and choose Developer Mode',
      );
    }
    throw new Error(`Cannot load ws: ${error.message}`);
  }
};

const WebSocket = loadWebSocket();

const TIMEOUT_MS = 3000;

const connect = (baseUrl, accessToken) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/realtime`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    const received = [];
    const waiting = [];

    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      const deliver = waiting.shift();
      if (deliver) {
        deliver(message);
      } else {
        received.push(message);
      }
    });
    socket.once('error', reject);
    socket.once('open', () =>
      resolve({
        send: (message) => socket.send(JSON.stringify(message)),
        next: () => {
          if (received.length > 0) {
            return Promise.resolve(received.shift());
          }
          return new Promise((resolveNext, rejectNext) => {
            const deliver = (message) => {
              clearTimeout(timer);
              resolveNext(message);
            };
            const timer = setTimeout(() => {
              waiting.splice(waiting.indexOf(deliver), 1);
              rejectNext(new Error(`No realtime message within ${TIMEOUT_MS} ms`));
            }, TIMEOUT_MS);
            waiting.push(deliver);
          });
        },
        close: () => socket.terminate(),
      }),
    );
  });

const listen = async (baseUrl, accessToken, spaceId) => {
  const client = await connect(baseUrl, accessToken);
  client.send({ type: 'subscribe', spaceId });
  return client;
};

const call = async (baseUrl, accessToken, method, path, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} returned ${response.status}`);
  }
};

module.exports = { connect, listen, call };
