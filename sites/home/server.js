const { startSite } = require('../../shared/site-server');

startSite({ name: 'EcoPickup Home', page: 'index.html', defaultPort: 3001 });