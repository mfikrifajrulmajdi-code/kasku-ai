const express = require('express');
const router = express.Router();
const { getConfig } = require('../config/db');

// Redirect root ke dashboard
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Halaman Dashboard
router.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    page: 'dashboard'
  });
});

// Halaman Settings
router.get('/settings', (req, res) => {
  const config = getConfig();
  res.render('settings', {
    title: 'Pengaturan',
    page: 'settings',
    config
  });
});

module.exports = router;
