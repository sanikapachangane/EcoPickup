const { startSite } = require('../../shared/site-server');

startSite({ name: 'EcoPickup Admin', page: 'admin.html', defaultPort: 3004 });