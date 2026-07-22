import http from 'node:http';

const port = Number(process.env.ICEAGE_FAKE_INFERENCE_PORT || 18092);
const intent = {
  action: 'add',
  name: 'Testvara från foto',
  category: 'Lagad mat',
  quantity: 1,
  unit: 'påse',
  locationName: 'Frysen på övervåningen',
  destinationName: null,
  frozenOn: null,
  eatBefore: null,
  dateSource: 'none',
  note: null,
  transcript: null,
  confidence: 0.99,
  uncertainFields: [],
};

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    return json(response, 200, { status: 'ok' });
  }

  let size = 0;
  request.on('data', (chunk) => {
    size += chunk.length;
    if (size > 25 * 1024 * 1024) request.destroy();
  });
  request.on('end', () => {
    if (request.method === 'POST' && request.url === '/inference') {
      return json(response, 200, { text: 'Jag tar ut en testpåse.' });
    }
    if (request.method === 'POST' && request.url === '/v1/chat/completions') {
      return json(response, 200, {
        choices: [{ message: { content: JSON.stringify(intent) } }],
      });
    }
    return json(response, 404, { error: 'not found' });
  });
});

server.listen(port, '127.0.0.1');
