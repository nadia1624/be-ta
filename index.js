require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.APP_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Sistem Agenda Pimpinan API is running' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
