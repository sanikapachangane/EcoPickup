const express = require('express');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ALLOW_DEMO_ADMIN = (process.env.ALLOW_DEMO_ADMIN || 'true').toLowerCase() !== 'false';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@ecopickup.local').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const allowedOrigins = new Set((process.env.CORS_ORIGINS || [3001, 3002, 3003, 3004]
  .map((port) => `http://localhost:${port}`)
  .join(','))
  .split(',')
  .map((origin) => origin.trim()));

const STATUS_ORDER = ['Pending', 'Accepted', 'Scheduled', 'Picked Up', 'Completed', 'Cancelled'];
const pickupRequests = [];
const adminSessions = new Map();

function generateRequestId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'EP-';
  while (id.length < 9) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }

  if (pickupRequests.some((request) => request.requestId === id)) {
    return generateRequestId();
  }

  return id;
}

function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return '';
  const match = cookieHeader.split(';').find((entry) => entry.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : '';
}

function isAdminAuthenticated(req) {
  const sessionToken = getCookieValue(req.headers.cookie || '', 'ecopickup_admin');
  return Boolean(sessionToken && adminSessions.has(sessionToken));
}

function requireAdmin(req, res, next) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized access. Admin login required.' });
  }
  return next();
}

function validateRequestPayload(payload) {
  const errors = {};
  const fullName = sanitizeString(payload.fullName);
  const phone = sanitizeString(payload.phone);
  const email = sanitizeString(payload.email);
  const wasteCategory = sanitizeString(payload.wasteCategory);
  const wasteDescription = sanitizeString(payload.wasteDescription);
  const quantity = sanitizeString(payload.quantity);
  const address = sanitizeString(payload.address);
  const city = sanitizeString(payload.city);
  const pincode = sanitizeString(payload.pincode);
  const pickupDate = sanitizeString(payload.pickupDate);
  const timeSlot = sanitizeString(payload.timeSlot);

  if (fullName.length < 2 || fullName.length > 80) {
    errors.fullName = 'Full name must be between 2 and 80 characters.';
  }

  if (!/^\d{10}$/.test(phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!wasteCategory) {
    errors.wasteCategory = 'Please select a waste category.';
  }

  if (!wasteDescription) {
    errors.wasteDescription = 'Please describe the waste.';
  }

  if (!quantity) {
    errors.quantity = 'Tell us the approximate quantity.';
  }

  if (!address) {
    errors.address = 'Please enter the pickup address.';
  }

  if (!city) {
    errors.city = 'Please enter the city.';
  }

  if (!/^\d{6}$/.test(pincode)) {
    errors.pincode = 'Pincode must be exactly 6 digits.';
  }

  if (!pickupDate) {
    errors.pickupDate = 'Please select a pickup date.';
  } else {
    const selectedDate = new Date(`${pickupDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      errors.pickupDate = 'Pickup date cannot be in the past.';
    }
  }

  if (!timeSlot) {
    errors.timeSlot = 'Please select a time slot.';
  }

  return errors;
}

function getStatusIndex(status) {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? 0 : index;
}

function sortRequests(requestList) {
  return [...requestList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getSummaryStats() {
  const total = pickupRequests.length;
  const statusCounts = STATUS_ORDER.reduce((counts, status) => {
    counts[status] = pickupRequests.filter((request) => request.status === status).length;
    return counts;
  }, {});

  const categories = {};
  pickupRequests.forEach((request) => {
    const category = request.wasteCategory || 'Unspecified';
    categories[category] = (categories[category] || 0) + 1;
  });

  const completed = statusCounts.Completed || 0;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    pending: statusCounts.Pending || 0,
    accepted: statusCounts.Accepted || 0,
    scheduled: statusCounts.Scheduled || 0,
    pickedUp: statusCounts['Picked Up'] || 0,
    completed,
    cancelled: statusCounts.Cancelled || 0,
    completionRate,
    categories,
    statusCounts,
  };
}

const seededRequests = [
  {
    requestId: 'EP-7K42P9',
    userId: 'demo-user-1',
    fullName: 'Aisha Mehta',
    phone: '9876543210',
    email: 'aisha@example.com',
    wasteCategory: 'E-Waste',
    wasteDescription: 'Old laptop, charger, and keyboard',
    quantity: '2 boxes',
    address: '12 Green Avenue, Sector 15',
    city: 'Bengaluru',
    pincode: '560001',
    pickupDate: '2026-10-02',
    timeSlot: 'Morning — 8 AM to 11 AM',
    instructions: 'Please ring the bell and leave at the gate.',
    status: 'Scheduled',
    createdAt: '2026-09-25T10:30:00.000Z',
    updatedAt: '2026-09-25T11:00:00.000Z',
  },
  {
    requestId: 'EP-3D28Q1',
    userId: 'demo-user-2',
    fullName: 'Rohan Nair',
    phone: '9123456789',
    email: 'rohan@example.com',
    wasteCategory: 'Plastic Waste',
    wasteDescription: 'Plastic bottles and packaging material',
    quantity: '6 bags',
    address: '45 Lake Road',
    city: 'Kochi',
    pincode: '682001',
    pickupDate: '2026-09-30',
    timeSlot: 'Afternoon — 11 AM to 2 PM',
    instructions: 'Collect from the rear entrance.',
    status: 'Accepted',
    createdAt: '2026-09-22T07:45:00.000Z',
    updatedAt: '2026-09-22T08:10:00.000Z',
  },
  {
    requestId: 'EP-8Q15L2',
    userId: 'demo-user-3',
    fullName: 'Meera Pillai',
    phone: '9988776655',
    email: 'meera@example.com',
    wasteCategory: 'Dry Waste',
    wasteDescription: 'Cardboard boxes and paper bundles',
    quantity: '3 bundles',
    address: '88 Lotus Street',
    city: 'Hyderabad',
    pincode: '500001',
    pickupDate: '2026-10-05',
    timeSlot: 'Evening — 2 PM to 6 PM',
    instructions: 'Driver can call before arrival.',
    status: 'Completed',
    createdAt: '2026-09-18T09:00:00.000Z',
    updatedAt: '2026-09-18T14:20:00.000Z',
  },
];

pickupRequests.push(...seededRequests);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept');
    return res.sendStatus(204);
  }

  return next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'EcoPickup API', timestamp: new Date().toISOString() });
});

app.get('/api/public/stats', (_req, res) => {
  res.json({ stats: getSummaryStats() });
});

app.post('/api/pickup-requests', (req, res) => {
  const payload = req.body || {};
  const validationErrors = validateRequestPayload(payload);

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      message: 'Please correct the highlighted fields in the form.',
      errors: validationErrors,
    });
  }

  const now = new Date().toISOString();
  const createdRequest = {
    requestId: generateRequestId(),
    userId: `user-${Date.now()}`,
    fullName: sanitizeString(payload.fullName),
    phone: sanitizeString(payload.phone),
    email: sanitizeString(payload.email),
    wasteCategory: sanitizeString(payload.wasteCategory),
    wasteDescription: sanitizeString(payload.wasteDescription),
    quantity: sanitizeString(payload.quantity),
    address: sanitizeString(payload.address),
    city: sanitizeString(payload.city),
    pincode: sanitizeString(payload.pincode),
    pickupDate: sanitizeString(payload.pickupDate),
    timeSlot: sanitizeString(payload.timeSlot),
    instructions: sanitizeString(payload.instructions),
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
  };

  pickupRequests.unshift(createdRequest);

  return res.status(201).json({
    message: 'Pickup Request Submitted Successfully!',
    request: createdRequest,
  });
});

app.get('/api/pickup-requests/:requestId', (req, res) => {
  const requestId = sanitizeString(req.params.requestId).toUpperCase();
  const request = pickupRequests.find((item) => item.requestId === requestId);

  if (!request) {
    return res.status(404).json({
      message: 'Request not found. Please verify the Request ID and try again.',
    });
  }

  return res.json({
    request: {
      requestId: request.requestId,
      wasteCategory: request.wasteCategory,
      pickupDate: request.pickupDate,
      timeSlot: request.timeSlot,
      address: request.address,
      city: request.city,
      pincode: request.pincode,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
  });
});

app.get('/api/pickup-requests', requireAdmin, (req, res) => {
  const search = sanitizeString(req.query.search || '').toLowerCase();
  let results = sortRequests(pickupRequests);

  if (search) {
    results = results.filter((request) => {
      return [request.requestId, request.fullName, request.email, request.wasteCategory, request.city]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }

  return res.json({ requests: results });
});

app.post('/api/admin/login', (req, res) => {
  if (!ALLOW_DEMO_ADMIN) {
    return res.status(403).json({ message: 'Demo admin access is disabled in this environment.' });
  }

  const email = sanitizeString(req.body.email || '').toLowerCase();
  const password = sanitizeString(req.body.password || '');

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, { createdAt: Date.now() });

  res.setHeader('Set-Cookie', `ecopickup_admin=${token}; HttpOnly; Path=/; SameSite=Lax`);
  return res.json({
    message: 'Admin login successful.',
    isAuthenticated: true,
    token,
  });
});

app.get('/api/admin/session', (req, res) => {
  res.json({ authenticated: isAdminAuthenticated(req) });
});

app.post('/api/admin/logout', (req, res) => {
  const token = getCookieValue(req.headers.cookie || '', 'ecopickup_admin');
  if (token) {
    adminSessions.delete(token);
  }

  res.setHeader('Set-Cookie', 'ecopickup_admin=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
  return res.json({ message: 'Logged out successfully.' });
});

app.get('/api/admin/requests', requireAdmin, (_req, res) => {
  return res.json({
    requests: sortRequests(pickupRequests),
    stats: getSummaryStats(),
  });
});

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  return res.json({ stats: getSummaryStats() });
});

app.patch('/api/admin/requests/:requestId/status', requireAdmin, (req, res) => {
  const requestId = sanitizeString(req.params.requestId).toUpperCase();
  const nextStatus = sanitizeString(req.body.status || '');

  if (!STATUS_ORDER.includes(nextStatus)) {
    return res.status(400).json({ message: 'The selected request status is invalid.' });
  }

  const request = pickupRequests.find((item) => item.requestId === requestId);
  if (!request) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  request.status = nextStatus;
  request.updatedAt = new Date().toISOString();

  return res.json({
    message: 'Request status updated successfully.',
    request,
  });
});

app.delete('/api/admin/requests/:requestId', requireAdmin, (req, res) => {
  const requestId = sanitizeString(req.params.requestId).toUpperCase();
  const requestIndex = pickupRequests.findIndex((item) => item.requestId === requestId);

  if (requestIndex === -1) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  const [removedRequest] = pickupRequests.splice(requestIndex, 1);
  return res.json({
    message: 'Request deleted successfully.',
    request: removedRequest,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`EcoPickup API server running on http://${HOST}:${PORT}`);
});
