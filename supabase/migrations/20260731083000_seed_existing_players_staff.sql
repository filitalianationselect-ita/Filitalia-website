-- FIL-ITALIA: importazione iniziale contenuti pubblici esistenti
-- Sicura e idempotente: non sovrascrive record già presenti con lo stesso ID.

insert into public.admin_players (
  id, name, birth_year, category, position, height_cm, club, city,
  nationality, instagram, highlights_url, image_url, card_image_url,
  status, profile_status, evaluations, notes
)
values
  (
    'mico-miguel-manliclic', 'Mico Miguel Manliclic', '2007', 'U19',
    'Point Guard', 175, 'Giants Marghera', 'Venezia',
    'Filipino / Italian', '', '', 'images/players/6.jpg', 'images/players/5.jpg',
    'active', 'complete', '{}'::jsonb, null
  ),
  (
    'christian-patrick-landicho', 'Christian Patrick Landicho', '2007', 'U19',
    'Point Guard', 175, 'Roma Basketball Academy', 'Roma',
    'Filipino / Italian', '', '', 'images/players/4.jpg', 'images/players/3.jpg',
    'active', 'complete', '{}'::jsonb, null
  ),
  (
    'brian-matthew-rosales', 'Brian Matthew Rosales', '2009', 'U17',
    'Shooting Guard', 184, 'BSL - Basket Save My Life', 'Bologna',
    'Filipino / Italian', '', '', 'images/players/2.jpg', 'images/players/1.jpg',
    'active', 'complete', '{}'::jsonb, null
  ),
  (
    'alexander-james-gatpandan', 'Alexander James Gatpandan', '2009', 'U19',
    'Guard / Small Forward', 185, 'Stella EBK', 'Roma',
    'Filipino / Italian', '', '', 'images/players/8.jpg', 'images/players/7.jpg',
    'active', 'complete', '{}'::jsonb, null
  ),
  (
    'aron-matalog', 'Aron Matalog', '2009', 'U17',
    'Point Guard', 170, '', 'Milano',
    'Filipino / Italian', 'aron.matalog', '', 'images/players/10.jpg', 'images/players/9.jpg',
    'active', 'complete', '{}'::jsonb, null
  )
on conflict (id) do nothing;

insert into public.admin_staff (
  id, name, role, department, city, email, phone, bio, image_url,
  availability, certifications, status
)
values
  (
    'emmanuel-jason-galve', 'Emmanuel Jason Galve',
    jsonb_build_object(
      'it', 'Coordinatore FIL-ITALIA',
      'en', 'FIL-ITALIA Coordinator',
      'ph', 'FIL-ITALIA Coordinator'
    ),
    'Directors', 'Tutte le città', '', '',
    jsonb_build_object(
      'it', 'South Europe Coordinator di FIL-EURO e responsabile di FIL-ITALIA Nation Select. Lavora per creare nuove opportunità ai giovani atleti, sviluppare il basket filippino in Italia e far crescere il progetto in tutta Europa.',
      'en', 'South Europe Coordinator of FIL-EURO and head of FIL-ITALIA Nation Select. He is committed to creating new opportunities for young athletes, developing Filipino basketball in Italy, and helping the project grow across Europe.',
      'ph', 'South Europe Coordinator ng FIL-EURO at namumuno sa FIL-ITALIA Nation Select.'
    ),
    'images/staff/ej.jpg', 'Disponibile', '{}'::jsonb, 'active'
  ),
  (
    'ocid-manliclic', 'Ocid Manliclic',
    jsonb_build_object('it','Coach - Coordinatore di Venezia','en','Coach - Venice Coordinator','ph','Coach - Venice Coordinator'),
    'Coaches', 'Venezia', '', '',
    jsonb_build_object(
      'it','Coordinatore di Venezia, accompagna i giovani atleti nel loro percorso di crescita attraverso allenamenti, eventi e attività dedicate alla comunità filippina.',
      'en','Venice Coordinator, helping young athletes grow through training sessions, events, and activities dedicated to the Filipino community.',
      'ph','Coordinator ng Venice na tumutulong sa pag-unlad ng mga kabataang atleta.'
    ),
    'images/staff/venezia.jpg', 'Disponibile', '{}'::jsonb, 'active'
  ),
  (
    'manuel-san-pedro', 'Manuel San Pedro',
    jsonb_build_object('it','Coach - Coordinatore di Firenze','en','Coach - Florence Coordinator','ph','Coach - Florence Coordinator'),
    'Coaches', 'Firenze', '', '',
    jsonb_build_object(
      'it','Coordinatore di Firenze, lavora ogni giorno per far crescere i giovani giocatori e creare un ambiente positivo dove imparare, divertirsi e migliorare insieme.',
      'en','Florence Coordinator, dedicated to helping young players improve while building a positive environment where everyone can learn, enjoy the game, and grow together.',
      'ph','Coordinator ng Florence na nakatuon sa pag-unlad ng mga kabataang manlalaro.'
    ),
    'images/staff/coach.jpg', 'Da confermare', '{}'::jsonb, 'active'
  ),
  (
    'julian-david', 'Julian David',
    jsonb_build_object('it','Coordinatore di Bologna','en','Bologna Coordinator','ph','Bologna Coordinator'),
    'Coaches', 'Bologna', '', '',
    jsonb_build_object(
      'it','Coordinatore di Bologna, promuove il basket tra i giovani della comunità filippina attraverso allenamenti, eventi e nuove opportunità sportive.',
      'en','Bologna Coordinator, promoting basketball within the Filipino community through training, events, and new opportunities for young athletes.',
      'ph','Coordinator ng Bologna na nagsusulong ng basketball sa Filipino community.'
    ),
    'images/staff/coach.jpg', 'Da confermare', '{}'::jsonb, 'active'
  ),
  (
    'steven-facun-cariaga', 'Steven Facun Cariaga',
    jsonb_build_object('it','Coach - Coordinatore di Roma','en','Coach - Rome Coordinator','ph','Coach - Rome Coordinator'),
    'Coaches', 'Roma', '', '',
    jsonb_build_object(
      'it','Coordinatore di Roma con oltre cinque anni di esperienza nel basket giovanile. Crede nello sviluppo dei ragazzi dentro e fuori dal campo.',
      'en','Rome Coordinator with more than five years of experience in youth basketball. He believes in developing players both on and off the court.',
      'ph','Coordinator ng Rome na may mahigit limang taong karanasan sa youth basketball.'
    ),
    'images/staff/coach.jpg', 'Disponibile', '{}'::jsonb, 'active'
  ),
  (
    'mark-jazon-cabrera', 'Mark Jazon Cabrera',
    jsonb_build_object('it','Coordinatore di Milano','en','Milan Coordinator','ph','Milan Coordinator'),
    'Coaches', 'Milano', '', '',
    jsonb_build_object(
      'it','Coordinatore di Milano e tra i primi a credere nel progetto FIL-EURO in Italia.',
      'en','Milan Coordinator and one of the first supporters of the FIL-EURO project in Italy.',
      'ph','Coordinator ng Milan at isa sa mga unang naniwala sa proyekto ng FIL-EURO sa Italy.'
    ),
    'images/staff/coach.jpg', 'Disponibile', '{}'::jsonb, 'active'
  ),
  (
    'clark-pitogo', 'Clark Pitogo',
    jsonb_build_object('it','Coordinatore Media FIL-ITALIA','en','FIL-ITALIA Media Coordinator','ph','FIL-ITALIA Media Coordinator'),
    'Media', 'Italia', '', '',
    jsonb_build_object(
      'it','Racconta attraverso foto e video il percorso, la passione e i valori della famiglia FIL-ITALIA.',
      'en','Through photos and videos, he captures the journey, passion, and values of the FIL-ITALIA family.',
      'ph','Sa pamamagitan ng mga larawan at video, ibinabahagi niya ang kwento at passion ng FIL-ITALIA.'
    ),
    'images/staff/coach.jpg', 'Disponibile', '{}'::jsonb, 'active'
  )
on conflict (id) do nothing;

insert into public.admin_content_layout (content_type, item_id, display_order, featured, home_section)
values
  ('player','mico-miguel-manliclic',10,true,'default'),
  ('player','christian-patrick-landicho',20,true,'default'),
  ('player','brian-matthew-rosales',30,true,'default'),
  ('player','alexander-james-gatpandan',40,false,'default'),
  ('player','aron-matalog',50,false,'default'),
  ('staff','emmanuel-jason-galve',10,true,'leadership'),
  ('staff','ocid-manliclic',20,false,'team'),
  ('staff','manuel-san-pedro',30,false,'team'),
  ('staff','julian-david',40,false,'team'),
  ('staff','steven-facun-cariaga',50,false,'team'),
  ('staff','mark-jazon-cabrera',60,false,'team'),
  ('staff','clark-pitogo',70,false,'team')
on conflict (content_type, item_id) do nothing;
