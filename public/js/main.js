// Shared helpers: AJAX wrapper, toast, validation, navbar, reveal animation
const api = (m, u, d) => $.ajax({ method: m, url: u, contentType: 'application/json', dataType: 'json',
  data: d ? JSON.stringify(d) : undefined }).catch(x => { throw (x.responseJSON && x.responseJSON.error) || 'Server error'; });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => 'Rs. ' + Number(n).toLocaleString();
function toast(msg, bad) {
  if (!$('#toast').length) $('body').append('<div id="toast" role="status"></div>');
  const t = $(`<div class="t ${bad ? 'bad' : ''}">${esc(msg)}</div>`).appendTo('#toast');
  setTimeout(() => t.fadeOut(400, () => t.remove()), 3500);
}
// Client-side validation: rules = {fieldId: fn(value) -> error string or ''}
function validate(form, rules) {
  let ok = true;
  $(form).find('.err').text(''); $(form).find('input,select,textarea').removeClass('invalid');
  for (const id in rules) {
    const el = $(form).find('#' + id), e = rules[id](el.val().trim());
    if (e) { ok = false; el.addClass('invalid'); el.next('.err').text(e); }
  }
  return ok;
}
const V = { req: m => v => v ? '' : m, email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email',
  pass: v => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v) ? '' : 'Use 8+ characters with letters and numbers',
  phone: v => !v || /^[0-9+\-\s]{7,15}$/.test(v) ? '' : 'Enter a valid phone number' };
function bgImg(el, url) { if (url) el.css('background-image', `url("${encodeURI(url)}"), linear-gradient(135deg,#43224a,#c8467d)`); }
function reveal() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.in)').forEach(n => io.observe(n));
}
function counters() {
  $('[data-count]').each(function () {
    const el = $(this), end = +el.data('count'); $({ n: 0 }).animate({ n: end }, { duration: 1800, step: n => el.text((end < 10 ? n.toFixed(1) : Math.floor(n).toLocaleString()) + el.data('suffix')) });
  });
}
$(function () {
  if ($('#nav').length) {
    $('#nav').html(`<header class="nav"><a class="logo" href="/">Lumière<small>Salon &amp; Beauty</small></a>
      <button class="burger" aria-label="Menu">☰</button><nav id="menu"><a href="/#services">Services</a><a href="/#team">Team</a><a href="/#gallery">Gallery</a><a href="/#contact">Contact</a><span id="acct"></span></nav></header>`);
    $('.burger').on('click', () => $('#menu').toggleClass('open'));
    api('GET', '/api/auth/me').then(u => $('#acct').html(u ? (u.role === 'admin' ? '<a class="btn sm" href="/admin">Admin</a>' : '<a class="btn sm" href="/account">My Account</a>')
      : '<a href="/login">Login</a> <a class="btn sm" href="/register">Join now</a>'));
  }
  reveal();
});
