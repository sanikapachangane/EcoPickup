const express = require('express');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function startSite({ name, page, defaultPort }) {
  const app = express();
  const port = Number(process.env.PORT) || defaultPort;
  const host = process.env.HOST || '0.0.0.0';

  app.get('/', (_req, res) => {
    res.sendFile(path.join(projectRoot, 'public', page));
  });
  app.get('/shared/api.js', (_req, res) => {
    res.sendFile(path.join(projectRoot, 'shared', 'api.js'));
  });
  app.get('/config.js', (_req, res) => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    res.type('application/javascript').send(`window.ECOPICKUP_API_URL = ${JSON.stringify(apiUrl)};`);
  });
  app.use(express.static(path.join(projectRoot, 'public')));

  app.listen(port, host, () => {
    console.log(`${name} website running on http://localhost:${port}`);
  });
}

module.exports = { startSite };