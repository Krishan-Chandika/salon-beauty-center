$('#f').on('submit', async function (e) {
  e.preventDefault();
  const mode = $(this).data('mode'), v = id => $('#' + id).val().trim();
  const rules = { email: V.email, password: mode === 'register' ? V.pass : V.req('Enter your password') };
  if (mode === 'register') Object.assign(rules, { name: x => x.length < 2 ? 'Enter your full name' : '', phone: V.phone,
    confirm: x => x === $('#password').val() ? '' : 'Passwords do not match' });
  if (!validate(this, rules)) return;
  try {
    if (mode === 'register') { await api('POST', '/api/auth/register', { name: v('name'), email: v('email'), phone: v('phone'), password: $('#password').val() });
      toast('Account created. Please log in.'); setTimeout(() => location = '/login', 1000); }
    else { const r = await api('POST', mode === 'admin' ? '/api/auth/admin-login' : '/api/auth/login', { email: v('email'), password: $('#password').val() });
      location = r.role === 'admin' ? '/admin' : '/account'; }
  } catch (m) { toast(m, true); }
});
