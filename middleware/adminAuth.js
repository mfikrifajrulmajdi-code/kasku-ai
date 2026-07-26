const session = require('express-session');

// Default admin credentials (override via .env)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'kasku2024';

function sessionMiddleware() {
    return session({
        secret: process.env.SESSION_SECRET || 'kasku-secret-key-change-me',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
    });
}

function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    // If it's an API request, return 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Otherwise redirect to login
    res.redirect('/admin/login');
}

function handleLogin(req, res) {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.redirect('/admin/tenants');
    }
    res.render('admin-login', { layout: false, error: 'Username atau password salah' });
}

function handleLogout(req, res) {
    req.session.destroy();
    res.redirect('/admin/login');
}

module.exports = { sessionMiddleware, requireAuth, handleLogin, handleLogout };
