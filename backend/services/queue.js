const Queue = require('bull');

const pdfQueue = new Queue('pdf-generation', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

pdfQueue.on('error', (err) => {
  console.error('Bull queue error:', err);
});

module.exports = {
  pdfQueue
};
