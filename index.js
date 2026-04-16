require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const port = process.env.APP_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Serve uploaded files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const periodeRoutes = require('./routes/periodeRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/periode', periodeRoutes);
app.use('/api/kaskpd', require('./routes/kaskpdRoutes'));
app.use('/api/pimpinan', require('./routes/pimpinanRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/agenda', require('./routes/agendaRoutes'));
app.use('/api/berita', require('./routes/beritaRoutes'));
app.use('/api/penugasan', require('./routes/penugasanRoutes'));
app.use('/api/laporan-kegiatan', require('./routes/laporanKegiatanRoutes'));
app.use('/api/dashboards', require('./routes/dashboardRoutes'));
app.use('/api/google-auth', require('./routes/googleAuthRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ajudan-assignments', require('./routes/ajudanAssignmentRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Sistem Agenda Pimpinan API is running' });
});

const { initReminders } = require('./helpers/reminderScheduler');
initReminders();

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
