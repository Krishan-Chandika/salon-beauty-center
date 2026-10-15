let payId = null;
const today = new Date().toISOString().slice(0, 10);
$('#booking_date').attr('min', today);
$('#booking_time').html('<option value="">Choose time</option>' + Array.from({ length: 10 }, (_, i) => { const h = String(i + 9).padStart(2, '0'); return `<option>${h}:00</option>`; }).join(''));
async function init() {
  const me = await api('GET', '/api/auth/me'); if (!me || me.role !== 'customer') return location = '/login';
  $('#hello').text('Hello, ' + me.name.split(' ')[0]);
  const [sv, st] = await Promise.all([api('GET', '/api/services'), api('GET', '/api/staff')]);
  $('#service_id').html('<option value="">Choose a service</option>' + sv.map(s => `<option value="${s.id}">${esc(s.name)} (${money(s.price)})</option>`).join(''));
  $('#staff_id').append(st.map(s => `<option value="${s.id}">${esc(s.name)}, ${esc(s.specialty)}</option>`).join(''));
  loadBookings();
}
async function loadBookings() {
  const b = await api('GET', '/api/my/bookings');
  $('#rows').html(b.length ? b.map(x => `<tr><td>${esc(x.service)}</td><td>${esc(x.staff || 'Any')}</td><td>${x.booking_date} ${x.booking_time.slice(0, 5)}</td><td>${money(x.price)}</td>
    <td><span class="badge ${x.status}">${x.status}</span></td><td><span class="badge ${x.payment_status}">${x.payment_status}</span></td>
    <td>${x.status !== 'cancelled' && x.payment_status === 'unpaid' ? `<button class="btn sm" data-pay="${x.id}" data-info="${esc(x.service)} - ${money(x.price)}">Pay</button> <button class="btn sm red" data-cancel="${x.id}">Cancel</button>` : ''}</td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">No bookings yet. Book your first appointment above.</td></tr>');
}
$('#bf').on('submit', async function (e) {
  e.preventDefault();
  if (!validate(this, { service_id: V.req('Choose a service'), booking_date: v => !v ? 'Choose a date' : v < today ? 'Date cannot be in the past' : '', booking_time: V.req('Choose a time') })) return;
  try { await api('POST', '/api/my/bookings', { service_id: $('#service_id').val(), staff_id: $('#staff_id').val(), booking_date: $('#booking_date').val(), booking_time: $('#booking_time').val(), notes: $('#notes').val() });
    toast('Booking saved. Pay now to confirm it.'); this.reset(); loadBookings(); location = '#mine'; } catch (m) { toast(m, true); }
});
$('#rows').on('click', '[data-cancel]', async function () {
  if (!confirm('Cancel this booking?')) return;
  try { await api('POST', `/api/my/bookings/${$(this).data('cancel')}/cancel`); toast('Booking cancelled'); loadBookings(); } catch (m) { toast(m, true); }
}).on('click', '[data-pay]', function () { payId = $(this).data('pay'); $('#pinfo').text($(this).data('info')); $('#pm').addClass('open'); });
$('#pc').on('click', () => $('#pm').removeClass('open'));
$('#card').on('input', function () { this.value = this.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim(); });
$('#expiry').on('input', function () { let v = this.value.replace(/\D/g, ''); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); this.value = v; });
$('#pf').on('submit', async function (e) {
  e.preventDefault();
  if (!validate(this, { card: v => v.replace(/\s/g, '').length < 13 ? 'Enter a valid card number' : '', expiry: v => /^(0[1-9]|1[0-2])\/\d{2}$/.test(v) ? '' : 'Use MM/YY', cvv: v => /^\d{3,4}$/.test(v) ? '' : '3 or 4 digits' })) return;
  try { const r = await api('POST', `/api/my/bookings/${payId}/pay`, { card: $('#card').val(), expiry: $('#expiry').val(), cvv: $('#cvv').val() });
    toast('Payment successful. Ref ' + r.ref); $('#pm').removeClass('open'); this.reset(); loadBookings(); } catch (m) { toast(m, true); }
});
$('.side .tab[href^="#"]').on('click', function () { $('.tab').removeClass('on'); $(this).addClass('on'); });
$('#logout').on('click', async () => { await api('POST', '/api/auth/logout'); location = '/'; });
init();
