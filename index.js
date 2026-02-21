require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const port = process.env.APP_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const periodeRoutes = require('./routes/periodeRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/periode', periodeRoutes);
app.use('/api/pimpinan', require('./routes/pimpinanRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/agenda', require('./routes/agendaRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Sistem Agenda Pimpinan API is running' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
