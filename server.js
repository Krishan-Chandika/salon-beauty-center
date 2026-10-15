const express = require('express'), session = require('express-session'), mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'), helmet = require('helmet'), path = require('path'), fs = require('fs');
const app = express();
const DB = process.env.DB_NAME || 'lumiere_salon';
const conn = { host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '2004Kcb@' };
let pool;

app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://code.jquery.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ['https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'], upgradeInsecureRequests: null } } }));
app.use(express.json({ limit: '20kb' }));
app.use(session({ secret: process.env.SESSION_SECRET || 'change-this-secret', resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 2 * 3600 * 1000 } }));

// ---------- helpers ----------
const wrap = f => (q, s) => f(q, s).catch(e => {
  if (typeof e === 'string') return s.status(400).json({ error: e });
  if (e.code === 'ER_ROW_IS_REFERENCED_2') return s.status(400).json({ error: 'This item is in use by other records and cannot be deleted.' });
  if (e.code === 'ER_DUP_ENTRY') return s.status(400).json({ error: 'That value already exists.' });
  console.error(e); s.status(500).json({ error: 'Server error' });
});
const need = role => (q, s, n) => !q.session.user ? s.status(401).json({ error: 'Please log in' })
  : (role && q.session.user.role !== role) ? s.status(403).json({ error: 'Not allowed' }) : n();
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
const strong = v => /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(v || '');
const tries = {};
const limiter = (q, s, n) => { const k = q.ip, now = Date.now(); const t = (tries[k] = (tries[k] || []).filter(x => now - x < 9e5));
  if (t.length >= 10) return s.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' }); t.push(now); n(); };

// ---------- auth ----------
const auth = express.Router();
auth.post('/register', limiter, wrap(async (q, s) => {
  const { name, email, phone, password } = q.body;
  if (!name || name.trim().length < 2) throw 'Enter your full name';
  if (!isEmail(email)) throw 'Enter a valid email';
  if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) throw 'Enter a valid phone number';
  if (!strong(password)) throw 'Password needs 8+ characters with letters and numbers';
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users(name,email,phone,password_hash) VALUES(?,?,?,?)', [name.trim(), email.toLowerCase(), phone || null, hash]);
  s.json({ ok: 1 });
}));
const login = role => wrap(async (q, s) => {
  const { email, password } = q.body;
  if (!isEmail(email) || !password) throw 'Enter your email and password';
  const [[u]] = await pool.query('SELECT * FROM users WHERE email=? AND role=?', [email.toLowerCase(), role]);
  if (!u || !(await bcrypt.compare(password, u.password_hash))) throw 'Incorrect email or password';
  q.session.regenerate(() => { q.session.user = { id: u.id, name: u.name, role: u.role }; s.json({ ok: 1, role: u.role }); });
});
auth.post('/login', limiter, login('customer'));
auth.post('/admin-login', limiter, login('admin'));
auth.post('/logout', (q, s) => q.session.destroy(() => s.json({ ok: 1 })));
auth.get('/me', (q, s) => s.json(q.session.user || null));
app.use('/api/auth', auth);

// ---------- public API ----------
app.get('/api/categories', wrap(async (q, s) => s.json((await pool.query('SELECT * FROM categories ORDER BY name'))[0])));
app.get('/api/staff', wrap(async (q, s) => s.json((await pool.query('SELECT * FROM staff ORDER BY id'))[0])));
app.get('/api/services', wrap(async (q, s) => {   // search + filter
  const w = [], p = [];
  if (q.query.q) { w.push('(s.name LIKE ? OR s.description LIKE ?)'); p.push(`%${q.query.q}%`, `%${q.query.q}%`); }
  if (q.query.cat) { w.push('s.category_id=?'); p.push(+q.query.cat); }
  const [r] = await pool.query(`SELECT s.*,c.name category_name FROM services s JOIN categories c ON c.id=s.category_id
    ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY c.name,s.name`, p);
  s.json(r);
}));

// ---------- customer API ----------
const my = express.Router(); my.use(need('customer'));
my.get('/bookings', wrap(async (q, s) => s.json((await pool.query(
  `SELECT b.*,sv.name service,sv.price,st.name staff FROM bookings b JOIN services sv ON sv.id=b.service_id
   LEFT JOIN staff st ON st.id=b.staff_id WHERE b.user_id=? ORDER BY b.booking_date DESC,b.booking_time DESC`, [q.session.user.id]))[0])));
my.post('/bookings', wrap(async (q, s) => {
  const { service_id, staff_id, booking_date, booking_time, notes } = q.body;
  if (!service_id || !booking_date || !/^\d{2}:\d{2}$/.test(booking_time || '')) throw 'Please fill in all required fields';
  const d = new Date(booking_date + 'T' + booking_time);
  if (isNaN(d) || d < new Date()) throw 'Choose a future date and time';
  const [[sv]] = await pool.query('SELECT id FROM services WHERE id=?', [service_id]);
  if (!sv) throw 'Invalid service';
  if (staff_id) {
    const [c] = await pool.query("SELECT id FROM bookings WHERE staff_id=? AND booking_date=? AND booking_time=? AND status<>'cancelled'", [staff_id, booking_date, booking_time]);
    if (c.length) throw 'That stylist is already booked at this time. Pick another slot.';
  }
  await pool.query('INSERT INTO bookings(user_id,service_id,staff_id,booking_date,booking_time,notes) VALUES(?,?,?,?,?,?)',
    [q.session.user.id, service_id, staff_id || null, booking_date, booking_time, (notes || '').slice(0, 250)]);
  s.json({ ok: 1 });
}));
my.post('/bookings/:id/cancel', wrap(async (q, s) => {
  const [r] = await pool.query("UPDATE bookings SET status='cancelled' WHERE id=? AND user_id=? AND status IN('pending','confirmed') AND payment_status='unpaid'", [q.params.id, q.session.user.id]);
  if (!r.affectedRows) throw 'This booking cannot be cancelled';
  s.json({ ok: 1 });
}));
// Mock payment: nothing real is charged and the full card number is never stored.
const luhn = n => [...n].reverse().reduce((a, c, i) => a + (i % 2 ? ((c * 2) > 9 ? c * 2 - 9 : c * 2) : +c), 0) % 10 === 0;
my.post('/bookings/:id/pay', wrap(async (q, s) => {
  const card = String(q.body.card || '').replace(/\s/g, ''), exp = String(q.body.expiry || ''), cvv = String(q.body.cvv || '');
  if (!/^\d{13,19}$/.test(card) || !luhn(card)) throw 'Invalid card number (try 4242 4242 4242 4242)';
  const m = exp.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m || new Date(2000 + +m[2], +m[1]) < new Date()) throw 'Card has expired or the date is invalid (MM/YY)';
  if (!/^\d{3,4}$/.test(cvv)) throw 'Invalid CVV';
  if (card === '4000000000000002') throw 'Payment declined by the test bank';
  const [[b]] = await pool.query(`SELECT b.id,b.status,b.payment_status,sv.price FROM bookings b JOIN services sv ON sv.id=b.service_id WHERE b.id=? AND b.user_id=?`, [q.params.id, q.session.user.id]);
  if (!b || b.status === 'cancelled' || b.payment_status === 'paid') throw 'This booking cannot be paid';
  const ref = 'TXN' + Date.now().toString(36).toUpperCase();
  await pool.query('INSERT INTO payments(booking_id,amount,card_last4,txn_ref) VALUES(?,?,?,?)', [b.id, b.price, card.slice(-4), ref]);
  await pool.query("UPDATE bookings SET payment_status='paid',status=IF(status='pending','confirmed',status) WHERE id=?", [b.id]);
  s.json({ ok: 1, ref });
}));
app.use('/api/my', my);

// ---------- admin API ----------
const adm = express.Router(); adm.use(need('admin'));
const crud = (name, table, fields, sel) => {
  const clean = b => { const o = {};
    for (const [f, t, req] of fields) { let v = b[f]; if (v === undefined || v === '') v = null;
      if (req && v === null) throw `${f.replace('_', ' ')} is required`;
      if (v !== null && t === 'n' && (isNaN(v) || +v < 0)) throw `${f.replace('_', ' ')} must be a positive number`;
      if (v !== null && t === 's') v = String(v).trim().slice(0, 500); o[f] = v; }
    return o; };
  adm.get(`/${name}`, wrap(async (q, s) => s.json((await pool.query(sel || `SELECT * FROM ${table} ORDER BY id DESC`))[0])));
  adm.post(`/${name}`, wrap(async (q, s) => { await pool.query(`INSERT INTO ${table} SET ?`, [clean(q.body)]); s.json({ ok: 1 }); }));
  adm.put(`/${name}/:id`, wrap(async (q, s) => { await pool.query(`UPDATE ${table} SET ? WHERE id=?`, [clean(q.body), q.params.id]); s.json({ ok: 1 }); }));
  adm.delete(`/${name}/:id`, wrap(async (q, s) => { await pool.query(`DELETE FROM ${table} WHERE id=?`, [q.params.id]); s.json({ ok: 1 }); }));
};
crud('categories', 'categories', [['name', 's', 1], ['description', 's']]);
crud('services', 'services', [['category_id', 'n', 1], ['name', 's', 1], ['description', 's'], ['price', 'n', 1], ['duration', 'n', 1], ['image', 's']],
  'SELECT s.*,c.name category_name FROM services s JOIN categories c ON c.id=s.category_id ORDER BY s.id DESC');
crud('staff', 'staff', [['name', 's', 1], ['specialty', 's'], ['phone', 's'], ['bio', 's'], ['image', 's']]);
adm.get('/bookings', wrap(async (q, s) => s.json((await pool.query(
  `SELECT b.*,u.name customer,sv.name service,sv.price,st.name staff FROM bookings b JOIN users u ON u.id=b.user_id
   JOIN services sv ON sv.id=b.service_id LEFT JOIN staff st ON st.id=b.staff_id ORDER BY b.booking_date DESC,b.booking_time DESC`))[0])));
adm.put('/bookings/:id', wrap(async (q, s) => {
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(q.body.status)) throw 'Invalid status';
  await pool.query('UPDATE bookings SET status=? WHERE id=?', [q.body.status, q.params.id]); s.json({ ok: 1 }); }));
adm.delete('/bookings/:id', wrap(async (q, s) => { await pool.query('DELETE FROM bookings WHERE id=?', [q.params.id]); s.json({ ok: 1 }); }));
adm.get('/customers', wrap(async (q, s) => s.json((await pool.query(
  `SELECT u.id,u.name,u.email,u.phone,u.created_at,COUNT(b.id) bookings FROM users u LEFT JOIN bookings b ON b.user_id=u.id
   WHERE u.role='customer' GROUP BY u.id ORDER BY u.id DESC`))[0])));
adm.delete('/customers/:id', wrap(async (q, s) => { await pool.query("DELETE FROM users WHERE id=? AND role='customer'", [q.params.id]); s.json({ ok: 1 }); }));
adm.get('/stats', wrap(async (q, s) => {
  const [[t]] = await pool.query(`SELECT (SELECT COUNT(*) FROM users WHERE role='customer') customers,(SELECT COUNT(*) FROM bookings) bookings,
    (SELECT COUNT(*) FROM services) services,(SELECT IFNULL(SUM(amount),0) FROM payments) revenue`);
  const [byStatus] = await pool.query('SELECT status,COUNT(*) n FROM bookings GROUP BY status');
  const [byService] = await pool.query(`SELECT sv.name,COUNT(b.id) n,IFNULL(SUM(p.amount),0) revenue FROM services sv
    LEFT JOIN bookings b ON b.service_id=sv.id AND b.status<>'cancelled' LEFT JOIN payments p ON p.booking_id=b.id GROUP BY sv.id ORDER BY n DESC LIMIT 8`);
  const [byMonth] = await pool.query("SELECT DATE_FORMAT(booking_date,'%Y-%m') m,COUNT(*) n FROM bookings GROUP BY m ORDER BY m DESC LIMIT 6");
  s.json({ totals: t, byStatus, byService, byMonth: byMonth.reverse() });
}));
app.use('/api/admin', adm);

// ---------- pages ----------
const page = (role, file, redirect) => (q, s) => q.session.user && q.session.user.role === role
  ? s.sendFile(path.join(__dirname, 'views', file)) : s.redirect(redirect);
app.get('/admin', page('admin', 'admin.html', '/admin-login'));
app.get('/account', page('customer', 'account.html', '/login'));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ---------- start ----------
(async () => {
  const c = await mysql.createConnection({ ...conn, multipleStatements: true });
  await c.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')); await c.end();
  pool = mysql.createPool({ ...conn, database: DB, dateStrings: true, connectionLimit: 10 });
  const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM users');
  if (!n) { await pool.query('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?),(?,?,?,?)', [
    'Salon Admin', 'admin@salon.com', await bcrypt.hash('Admin@123', 10), 'admin',
    'Demo Customer', 'customer@salon.com', await bcrypt.hash('Customer@123', 10), 'customer']);
    require('./seed')(pool); }
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Lumiere Salon running -> http://localhost:${port}`));
})().catch(e => { console.error('Startup failed. Is MySQL running and are DB_USER / DB_PASS correct?\n', e.message); process.exit(1); });
