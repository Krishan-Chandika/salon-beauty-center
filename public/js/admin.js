// Config-driven CRUD for services, categories and staff
const M = {
  services: { title: 'Services', cols: [['name', 'Name'], ['category_name', 'Category'], ['price', 'Price', money], ['duration', 'Minutes']],
    fields: [['name', 'Name', 'text', 1], ['category_id', 'Category', 'select', 1], ['price', 'Price (Rs.)', 'number', 1], ['duration', 'Duration (min)', 'number', 1], ['description', 'Description', 'text'], ['image', 'Image URL', 'text']] },
  categories: { title: 'Categories', cols: [['name', 'Name'], ['description', 'Description']], fields: [['name', 'Name', 'text', 1], ['description', 'Description', 'text']] },
  staff: { title: 'Staff', cols: [['name', 'Name'], ['specialty', 'Specialty'], ['phone', 'Phone']],
    fields: [['name', 'Name', 'text', 1], ['specialty', 'Specialty', 'text'], ['phone', 'Phone', 'text'], ['bio', 'Bio', 'text'], ['image', 'Photo URL', 'text']] }
};
const view = $('#view'); let cur = 'dashboard', editId = null, rows = [];
const table = (heads, body) => `<div style="overflow-x:auto"><table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td class="empty" colspan="${heads.length}">Nothing here yet.</td></tr>`}</tbody></table></div>`;
const bars = (items, label, val, fmt) => { const mx = Math.max(1, ...items.map(i => +i[val])); return items.map(i => `<div class="bar"><span>${esc(i[label])}</span><i data-w="${(i[val] / mx) * 100}"></i><b>${fmt ? fmt(i[val]) : i[val]}</b></div>`).join('') || '<p class="empty">No data yet.</p>'; };
const grow = () => setTimeout(() => $('.bar i').each(function () { this.style.width = $(this).data('w') + '%'; }), 60);

async function show(v) {
  cur = v; $('.tab').removeClass('on').filter(`[data-v=${v}]`).addClass('on');
  try {
    if (v === 'dashboard' || v === 'reports') {
      const s = await api('GET', '/api/admin/stats'), t = s.totals;
      let h = `<h2>${v === 'dashboard' ? 'Dashboard' : 'Reports'}</h2><div class="cards4">${[['Revenue', money(t.revenue)], ['Bookings', t.bookings], ['Customers', t.customers], ['Services', t.services]].map(c => `<div class="stat"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('')}</div>
      <div class="box"><h3>Popular services</h3>${bars(s.byService, 'name', 'n')}</div>
      <div class="box"><h3>Revenue by service</h3>${bars(s.byService, 'name', 'revenue', money)}</div>
      <div class="box"><h3>Bookings by month</h3>${bars(s.byMonth, 'm', 'n')}</div><div class="box"><h3>Bookings by status</h3>${bars(s.byStatus, 'status', 'n')}</div>`;
      if (v === 'reports') h += '<div class="tools"><button class="btn" id="csv">Export bookings (CSV)</button><button class="btn dark" id="prt">Print report</button></div>';
      view.html(h); grow();
    } else if (v === 'bookings') {
      rows = await api('GET', '/api/admin/bookings');
      view.html(`<h2>Bookings</h2><div class="tools"><input id="flt" placeholder="Filter by customer or service" style="max-width:300px"><select id="fs" style="max-width:180px"><option value="">All statuses</option><option>pending</option><option>confirmed</option><option>completed</option><option>cancelled</option></select></div><div id="bt"></div>`);
      drawBookings();
    } else if (v === 'customers') {
      rows = await api('GET', '/api/admin/customers');
      view.html('<h2>Customers</h2>' + table(['Name', 'Email', 'Phone', 'Bookings', 'Joined', ''], rows.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.phone || '-')}</td><td>${c.bookings}</td><td>${c.created_at.slice(0, 10)}</td><td><button class="btn sm red" data-del="${c.id}">Delete</button></td></tr>`).join('')));
    } else {
      const c = M[v]; rows = await api('GET', `/api/admin/${v}`);
      view.html(`<h2>${c.title}</h2><div class="tools"><button class="btn" id="add">Add new</button></div>` + table([...c.cols.map(x => x[1]), ''],
        rows.map(r => `<tr>${c.cols.map(x => `<td>${esc(x[2] ? x[2](r[x[0]]) : r[x[0]] ?? '-')}</td>`).join('')}<td style="white-space:nowrap"><button class="btn sm dark" data-edit="${r.id}">Edit</button> <button class="btn sm red" data-del="${r.id}">Delete</button></td></tr>`).join('')));
    }
  } catch (m) { if (m === 'Please log in' || m === 'Not allowed') location = '/admin-login'; else toast(m, true); }
}
function drawBookings() {
  const q = ($('#flt').val() || '').toLowerCase(), st = $('#fs').val();
  const f = rows.filter(r => (!st || r.status === st) && (r.customer + r.service).toLowerCase().includes(q));
  $('#bt').html(table(['Customer', 'Service', 'Stylist', 'When', 'Price', 'Status', 'Paid', ''], f.map(r => `<tr><td>${esc(r.customer)}</td><td>${esc(r.service)}</td><td>${esc(r.staff || '-')}</td><td>${r.booking_date} ${r.booking_time.slice(0, 5)}</td><td>${money(r.price)}</td>
    <td><select data-st="${r.id}" style="padding:5px">${['pending', 'confirmed', 'completed', 'cancelled'].map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td><span class="badge ${r.payment_status}">${r.payment_status}</span></td><td><button class="btn sm red" data-del="${r.id}">Delete</button></td></tr>`).join('')));
}
view.on('input change', '#flt,#fs', drawBookings);
view.on('change', '[data-st]', async function () { try { await api('PUT', `/api/admin/bookings/${$(this).data('st')}`, { status: this.value }); toast('Status updated'); } catch (m) { toast(m, true); } });
view.on('click', '[data-del]', async function () {
  if (!confirm('Delete this record permanently?')) return;
  try { await api('DELETE', `/api/admin/${cur}/${$(this).data('del')}`); toast('Deleted'); show(cur); } catch (m) { toast(m, true); }
});
view.on('click', '#add', () => openForm()); view.on('click', '[data-edit]', function () { openForm(rows.find(r => r.id == $(this).data('edit'))); });
view.on('click', '#prt', () => window.print());
view.on('click', '#csv', async () => {
  const b = await api('GET', '/api/admin/bookings'), cols = ['customer', 'service', 'staff', 'booking_date', 'booking_time', 'status', 'payment_status', 'price'];
  const csv = [cols.join(','), ...b.map(r => cols.map(c => '"' + String(r[c] ?? '').replace(/"/g, '""') + '"').join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'bookings.csv'; a.click();
});
async function openForm(r) {
  const c = M[cur]; editId = r ? r.id : null; $('#mt').text((r ? 'Edit ' : 'Add ') + c.title.toLowerCase());
  const cats = cur === 'services' ? await api('GET', '/api/categories') : [];
  $('#mfields').html(c.fields.map(f => `<label for="${f[0]}">${f[1]}</label>` + (f[2] === 'select'
    ? `<select id="${f[0]}"><option value="">Choose</option>${cats.map(x => `<option value="${x.id}" ${r && r.category_id == x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`
    : `<input id="${f[0]}" type="${f[2]}" min="0" value="${esc(r ? r[f[0]] : '')}">`) + '<span class="err"></span>').join(''));
  $('#m').addClass('open');
}
$('#mc').on('click', () => $('#m').removeClass('open'));
$('#mf').on('submit', async function (e) {
  e.preventDefault(); const c = M[cur], rules = {}, data = {};
  c.fields.forEach(f => { data[f[0]] = $('#' + f[0]).val().trim(); if (f[3]) rules[f[0]] = V.req(f[1] + ' is required'); if (f[2] === 'number') rules[f[0]] = v => !v || isNaN(v) || +v < 0 ? 'Enter a valid positive number' : ''; });
  if (!validate(this, rules)) return;
  try { await api(editId ? 'PUT' : 'POST', `/api/admin/${cur}${editId ? '/' + editId : ''}`, data); toast('Saved'); $('#m').removeClass('open'); show(cur); } catch (m) { toast(m, true); }
});
$('.tab').on('click', function () { show($(this).data('v')); });
$('#logout').on('click', async () => { await api('POST', '/api/auth/logout'); location = '/admin-login'; });
show('dashboard');
