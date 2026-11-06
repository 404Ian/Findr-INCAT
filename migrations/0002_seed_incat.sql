-- migrations/0002_seed_incat.sql
INSERT
OR REPLACE INTO locations (id, name, building, type, lat, lng, description)
VALUES
    (
        'hub-guard-house',
        'Guard House',
        'Main Gate (P. Gomez St.)',
        'dropoff',
        18.19845,
        120.59315,
        '24/7 main entrance security desk and primary drop-off point.'
    ),
    (
        'hub-guidance',
        'Guidance Office',
        'Administration Building',
        'dropoff',
        18.19878,
        120.59348,
        'Student affairs and lost ID / valuable item safekeeping.'
    ),
    (
        'hub-ssg-office',
        'SSG / Student Center',
        'Student Center Pavilion',
        'dropoff',
        18.19895,
        120.59372,
        'Supreme Student Government desk for student-turned-in items.'
    ),
    (
        'hub-ict-lab',
        'ICT / Computer Lab',
        'TVL & ICT Building, 2F',
        'lab',
        18.19912,
        120.59395,
        'Computer programming and networking laboratories.'
    ),
    (
        'hub-electronics-lab',
        'Electronics & Electrical Lab',
        'Industrial Arts Building',
        'lab',
        18.19925,
        120.59355,
        'EIM and EPAS workshop rooms.'
    ),
    (
        'hub-automotive-shop',
        'Automotive & Welding Shop',
        'North Trade Complex',
        'lab',
        18.19942,
        120.59328,
        'Automotive servicing and SMAW trade bays.'
    ),
    (
        'hub-food-trades',
        'Food Trades & Garments Lab',
        'Home Economics Building',
        'lab',
        18.19862,
        120.59388,
        'Bread & Pastry, Cookery, and Dressmaking laboratories.'
    ),
    (
        'hub-library',
        'Campus Library',
        'Academic Building, 2F',
        'facility',
        18.19885,
        120.59412,
        'Reading hall and study tables.'
    ),
    (
        'hub-gymnasium',
        'INCAT Covered Court',
        'Campus Quadrangle',
        'facility',
        18.19892,
        120.59362,
        'Main assembly court, bleachers, and stage area.'
    ),
    (
        'hub-canteen',
        'Campus Canteen',
        'South Wing',
        'facility',
        18.19852,
        120.59358,
        'Main dining area and food stalls.'
    );

-- Sample INCAT tags & posts (using pre-hashed demo capability keys)
INSERT
OR REPLACE INTO tags (
    id,
    public_code,
    manage_key_hash,
    label,
    item_type,
    photo_key,
    contact_methods,
    relay_mode,
    lost_mode,
    created_at
)
VALUES
    (
        'tag-demo-calc-01',
        'K9X4M7P2Q8W5',
        '8f9d2a7e1c4b5f6a3d2e1b9c8a7f6e5d4c3b2a190807060504030201ffeeddcc',
        'Casio fx-991EX ClassWiz Calculator',
        'calculators_tools',
        NULL,
        '{"methods":[{"kind":"messenger","value":"m.me/incat.student.demo","visible":false}],"relayMode":true,"dropOffHub":"Guidance Office"}',
        1,
        1,
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 hours')
    ),
    (
        'tag-demo-flask-02',
        'T3N8V5R9L2H6',
        '1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809',
        'Moss Green AquaFlask 24oz',
        'tumblers_containers',
        NULL,
        '{"methods":[{"kind":"sms","value":"09170001122","visible":true}],"relayMode":false,"dropOffHub":"Guard House"}',
        0,
        0,
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')
    );

INSERT
OR REPLACE INTO posts (
    id,
    type,
    title,
    description,
    category,
    location_id,
    lat,
    lng,
    image_keys,
    contact,
    status,
    linked_tag_code,
    claim_question,
    claim_answer_hash,
    edit_key_hash,
    created_at,
    resolved_at
)
VALUES
    (
        'post-incat-01',
        'lost',
        'Black Leather Cardholder Wallet',
        'Slipped out of my pocket while walking from the Campus Canteen toward the TVL & ICT Building stairs. Contains transit coins and a folded receipt.',
        'wallets_cash',
        'hub-canteen',
        18.19856,
        120.59365,
        '[]',
        '{"methods":[{"kind":"messenger","value":"m.me/incat.finder.relay","visible":false}],"relayMode":true,"dropOffHub":"Guard House"}',
        'open',
        NULL,
        NULL,
        NULL,
        'aa11bb22cc33dd44ee55ff6677889900aa11bb22cc33dd44ee55ff6677889900',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-90 minutes'),
        NULL
    ),
    (
        'post-incat-02',
        'found',
        'Silver USB-C 64GB Flash Drive on Red Lanyard',
        'Left plugged into Workstation #14 after the afternoon ICT programming class. Turned in to the lab instructor desk.',
        'electronics',
        'hub-ict-lab',
        18.19912,
        120.59395,
        '[]',
        '{"methods":[{"kind":"messenger","value":"m.me/ict.lab.custodian","visible":true}],"relayMode":false,"dropOffHub":"ICT / Computer Lab"}',
        'open',
        NULL,
        'What is the folder name on the root of the drive?',
        '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        'bb22cc33dd44ee55ff66778899001122bb22cc33dd44ee55ff66778899001122',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-4 hours'),
        NULL
    ),
    (
        'post-incat-03',
        'found',
        'Cream Canvas Tote Bag with Sketchpad',
        'Found on the second-row bleachers at the INCAT Covered Court after morning assembly. Currently safekept at the Guard House.',
        'bags_apparel',
        'hub-gymnasium',
        18.19892,
        120.59362,
        '[]',
        '{"methods":[],"relayMode":true,"dropOffHub":"Guard House"}',
        'open',
        NULL,
        'What brand of fineliner pens are inside the front pouch?',
        NULL,
        'cc33dd44ee55ff667788990011223344cc33dd44ee55ff667788990011223344',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-6 hours'),
        NULL
    ),
    (
        'post-incat-04',
        'lost',
        'Casio fx-991EX ClassWiz Scientific Calculator',
        'Has a Findr QR sticker on the back cover. Needed urgently for Trade Math assessment.',
        'calculators_tools',
        'hub-electronics-lab',
        18.19925,
        120.59355,
        '[]',
        '{"methods":[],"relayMode":true,"dropOffHub":"Guidance Office"}',
        'returned',
        'K9X4M7P2Q8W5',
        NULL,
        NULL,
        'dd44ee55ff6677889900112233445566dd44ee55ff6677889900112233445566',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'),
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 hours')
    );