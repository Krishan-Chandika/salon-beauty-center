const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;
$('[data-img]').each(function () { bgImg($(this), U($(this).data('img'))); });
let cat = '', timer;
async function loadServices() {  // AJAX search + filter
  const list = await api('GET', `/api/services?q=${encodeURIComponent($('#q').val())}&cat=${cat}`);
  $('#services').html(list.length ? list.map(s => `<article class="card"><div class="thumbbox"><div class="thumb" data-id="${s.id}"></div></div><div class="body">
    <span class="tag">${esc(s.category_name)}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p>
    <div class="row"><span class="price">${money(s.price)} <small style="color:var(--mute)">/ ${s.duration} min</small></span><a class="btn sm" href="/account">Book</a></div></div></article>`).join('')
    : '<p class="empty" style="grid-column:1/-1">No services match your search. Try another word or category.</p>');
  list.forEach(s => bgImg($(`.thumb[data-id=${s.id}]`), s.image));
  $('#services .card').hide().each((i, c) => $(c).delay(i * 80).fadeIn(400));  // jQuery effect
}
(async () => {
  const cats = await api('GET', '/api/categories');
  $('#cats').html('<button class="chip on" data-c="">All</button>' + cats.map(c => `<button class="chip" data-c="${c.id}">${esc(c.name)}</button>`).join(''));
  $('#cats').on('click', '.chip', function () { $('.chip').removeClass('on'); $(this).addClass('on'); cat = $(this).data('c'); loadServices(); });
  $('#q').on('input', () => { clearTimeout(timer); timer = setTimeout(loadServices, 300); });
  loadServices();
  const st = await api('GET', '/api/staff');
  $('#staff').html(st.map(s => `<article class="card"><div class="avatar" data-s="${s.id}"></div><div class="body"><h3>${esc(s.name)}</h3><span class="tag">${esc(s.specialty)}</span><p style="margin-top:10px">${esc(s.bio)}</p></div></article>`).join(''));
  st.forEach(s => bgImg($(`.avatar[data-s=${s.id}]`), s.image));
  reveal();
})();
let counted = false;
new IntersectionObserver((e, o) => { if (e[0].isIntersecting && !counted) { counted = true; counters(); } }).observe(document.querySelector('.stats'));
