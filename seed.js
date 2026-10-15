const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;
module.exports = async pool => {
  await pool.query('INSERT INTO categories(name,description) VALUES ?', [[
    ['Hair', 'Cuts, colour and styling'], ['Skin', 'Facials and skin rituals'], ['Nails', 'Manicure and pedicure'],
    ['Makeup', 'Everyday looks and bridal'], ['Spa', 'Massage and relaxation']]]);
  await pool.query('INSERT INTO services(category_id,name,description,price,duration,image) VALUES ?', [[
    [1, 'Signature Haircut & Blow-dry', 'Consultation, precision cut and a smooth finish.', 3500, 60, U('1522337360788-8b13dee7a37e')],
    [1, 'Hair Colour & Gloss', 'Full colour with a conditioning gloss treatment.', 9500, 150, U('1560066984-138dadb4c035')],
    [2, 'Glow Facial', 'Deep cleanse, exfoliation and hydrating mask.', 5500, 60, U('1570172619644-dfd03ed5d881')],
    [3, 'Gel Manicure', 'Shape, cuticle care and long-lasting gel polish.', 2800, 45, U('1604654894610-df63bc536371')],
    [4, 'Party Makeup', 'Full-face makeup for events and photos.', 6500, 75, U('1487412947147-5cebf100ffc2')],
    [5, 'Aroma Relax Massage', 'Slow, full-body massage with warm aromatic oils.', 7000, 90, U('1519415510236-718bdfcd89c8')]]]);
  await pool.query('INSERT INTO staff(name,specialty,phone,bio,image) VALUES ?', [[
    ['Amaya Perera', 'Senior Hair Stylist', '0771234567', '12 years shaping cuts and colour.', U('1580618672591-eb180b1a973f')],
    ['Nethmi Silva', 'Makeup Artist', '0712345678', 'Bridal and editorial makeup specialist.', U('1494790108377-be9c29b29330')],
    ['Dilan Fernando', 'Skin & Spa Therapist', '0763456789', 'Facials and relaxation therapies.', U('1507003211169-0a1dd7228f2d')]]]);
};
