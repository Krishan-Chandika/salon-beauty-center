# Lumière Salon & Beauty Center (Practical 01 + Practical 02)

Full-stack salon booking system: HTML5, CSS3 (Flexbox, Grid, media queries), JavaScript, jQuery + AJAX, Node.js + Express, MySQL.

## Run it
1. Install Node.js 18+ and MySQL 8 (or XAMPP's MySQL). Start MySQL.
2. In this folder:
   ```
   npm install
   npm start
   ```
   Optional env vars: `DB_HOST`, `DB_USER` (default root), `DB_PASS` (default empty), `DB_NAME`, `SESSION_SECRET`, `PORT`.
   Windows example: `set DB_PASS=yourpassword && npm start`
3. Open http://localhost:3000. The database, tables and sample data are created automatically on first start.

## Pages (6 separate)
| Page | URL |
|---|---|
| Public website | `/` |
| Customer login | `/login` |
| Customer registration | `/register` |
| Customer account (book, pay, cancel) | `/account` |
| Admin login | `/admin-login` |
| Admin dashboard | `/admin` |

## Demo accounts
- Admin: `admin@salon.com` / `Admin@123`
- Customer: `customer@salon.com` / `Customer@123`

## Practical 01 coverage
- Semantic HTML5, responsive CSS (Grid/Flexbox/media queries), animations
- DOM + events, client-side validation (`validate()` in `main.js`)
- jQuery effects and AJAX (service search/filter, all admin tables)
- Express routes + REST API (`server.js`), MySQL with 6 related tables
- CRUD: Services, Categories, Staff, Bookings

## Practical 02 coverage
- Login/logout with sessions; separate admin and customer portals
- bcrypt password hashing, server-side validation, parameterised SQL, role-protected routes, Helmet headers, login rate limiting, HTTP-only cookies
- Search/filter, dashboard, reports (charts, CSV export, print)
- Extra CRUD modules: Staff and Customers; double-booking prevention
- Mock payment (Luhn check, only last 4 digits stored). Decline test card: `4000 0000 0000 0002`
- See `ENHANCEMENT_REPORT.md`

## Images
Photos load from Unsplash. If offline, gradient placeholders appear. Replace any image by pasting a new URL in Admin > Services/Staff, or add files in `public/` and use `/your-file.jpg`.

## Database
`schema.sql`: users, categories, services, staff, bookings, payments (foreign keys; bookings reference users/services/staff; payments reference bookings).
