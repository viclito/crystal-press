const net = require('net');

console.log('Testing raw TCP connect to ep-long-sea-az1y9pr8-pooler.c-3.ap-southeast-1.aws.neon.tech:5432...');

const socket = net.createConnection(5432, 'ep-long-sea-az1y9pr8-pooler.c-3.ap-southeast-1.aws.neon.tech', () => {
  console.log('TCP Connected successfully!');
  socket.end();
});

socket.on('error', (err) => {
  console.error('TCP Socket error:', err.message);
});

socket.setTimeout(8000, () => {
  console.error('TCP Connection timed out after 8s');
  socket.destroy();
});
