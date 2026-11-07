INSERT
OR IGNORE INTO locations (
    id,
    name,
    building_code,
    is_drop_off_hub,
    lat,
    lng,
    description
)
VALUES
    INSERT
    OR REPLACE INTO locations (
        id,
        name,
        building_code,
        is_drop_off_hub,
        lat,
        lng,
        description
    )
VALUES
    (
        'loc-guard-house',
        'Guard House',
        'GATE-1',
        1,
        18.20339,
        120.59228,
        'Main gate security post along P. Gomez St. Open 24/7 for item drop-off.'
    ),
    (
        'loc-guidance',
        'Guidance Office',
        'ADMIN-1F',
        1,
        18.20379,
        120.59258,
        'Ground floor, Administration Building. Official safekeeping for IDs and valuables.'
    ),
    (
        'loc-ssg',
        'SSG / Student Affairs Office',
        'OSA-1F',
        1,
        18.20399,
        120.59248,
        'Supreme Student Government office near the student quadrangle.'
    ),
    (
        'loc-ict-lab',
        'ICT / Computer Lab',
        'ICT-2F',
        1,
        18.20419,
        120.59288,
        '2nd floor ICT Building. Check with the lab technician for flash drives and gadgets.'
    ),
    (
        'loc-electronics-lab',
        'Electronics & Electrical Lab',
        'TECH-A',
        1,
        18.20439,
        120.59238,
        'Trade & Tech Building A. Multimeters, calculators, and lab tools.'
    ),
    (
        'loc-automotive-shop',
        'Automotive & Mechanical Shop',
        'SHOP-B',
        1,
        18.20449,
        120.59308,
        'North Workshop Complex.'
    ),
    (
        'loc-garments-lab',
        'Garments & Cosmetology Lab',
        'TVL-1F',
        1,
        18.20369,
        120.59298,
        'TVL Home Economics wing, 1st floor.'
    ),
    (
        'loc-food-trades',
        'Food Trades / Culinary Lab',
        'TVL-2F',
        1,
        18.20359,
        120.59318,
        'Baking and culinary arts laboratory.'
    ),
    (
        'loc-drafting-studio',
        'Drafting & Civil Tech Studio',
        'TECH-C',
        1,
        18.20429,
        120.59268,
        'T-squares, canisters, and engineering calculators.'
    ),
    (
        'loc-library',
        'Main Library',
        'LIB-2F',
        1,
        18.20389,
        120.59278,
        'Circulation desk holds notebooks, books, and umbrellas left at tables.'
    ),
    (
        'loc-canteen',
        'School Canteen',
        'CANT',
        0,
        18.20349,
        120.59268,
        'Main student dining area.'
    ),
    (
        'loc-covered-court',
        'Covered Court / Gymnasium',
        'GYM',
        0,
        18.20409,
        120.59218,
        'Campus covered court and bleachers.'
    );

-- SHA-256('demo_manage_key_calc_incat_2026_xyz9') = '8576903f4d987e42327efee7a1d1f2d9b7e1227b690e7eb31510a2fd63d1208b'
INSERT
OR IGNORE INTO tags (
    id,
    public_code,
    manage_key_hash,
    label,
    item_type,
    photo_key,
    contact_methods,
    relay_mode,
    lost_mode,
    lost_note,
    created_at
)
VALUES
    (
        'tag-incat-calc',
        'K9M4X7P2Q8LA',
        '8576903f4d987e42327efee7a1d1f2d9b7e1227b690e7eb31510a2fd63d1208b',
        'Casio fx-991EX ClassWiz Calculator',
        'calculators',
        NULL,
        '{"relayMode":true,"dropOffHub":"Guidance Office","methods":[{"kind":"messenger","value":"m.me/incat.drafting.owner","visible":true}]}',
        1,
        0,
        NULL,
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 days')
    ),
    (
        'tag-incat-tumbler',
        'T7V3N9R4W2BC',
        '8576903f4d987e42327efee7a1d1f2d9b7e1227b690e7eb31510a2fd63d1208b',
        'Moss Green AquaFlask 24oz',
        'tumblers_containers',
        NULL,
        '{"relayMode":true,"dropOffHub":"Guard House","methods":[{"kind":"sms","value":"09175550143","visible":false}]}',
        1,
        1,
        'Left near the bleachers after afternoon PE class. Please drop off at the Guard House or send a message!',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')
    );

-- SHA-256('demo_edit_key_wallet_incat_2026_abcd') = '9a09f633e131251c48bc9b3486e391b993a9bd9d9e033c77c6fc8d8d09f61963'
INSERT
OR IGNORE INTO posts (
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
    claim_question_prompt,
    claim_answer_hash,
    edit_key_hash,
    occurred_at,
    created_at,
    resolved_at
)
VALUES
    (
        'post-incat-1',
        'lost',
        'Black braided leather cardholder wallet',
        'Lost walking between the School Canteen and the ICT Building around 11:45 AM. Has a tricycle fare pouch and two laminated transit cards inside.',
        'wallets_cash',
        'loc-canteen',
        18.19625,
        120.59275,
        '[]',
        '{"relayMode":true,"dropOffHub":"Guard House","methods":[{"kind":"messenger","value":"m.me/jdelacruz.incat","visible":true}]}',
        'open',
        NULL,
        NULL,
        NULL,
        '9a09f633e131251c48bc9b3486e391b993a9bd9d9e033c77c6fc8d8d09f61963',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 hours'),
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 hours'),
        NULL
    ),
    (
        'post-incat-2',
        'lost',
        'Moss Green AquaFlask 24oz with silicone boot',
        'Left on the second row of the Covered Court bleachers. Has a Findr QR sticker near the bottom rim.',
        'tumblers_containers',
        'loc-covered-court',
        18.19682,
        120.59225,
        '[]',
        '{"relayMode":true,"dropOffHub":"Guard House","methods":[]}',
        'open',
        'T7V3N9R4W2BC',
        NULL,
        NULL,
        '9a09f633e131251c48bc9b3486e391b993a9bd9d9e033c77c6fc8d8d09f61963',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-6 hours'),
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-5 hours'),
        NULL
    ),
    (
        'post-incat-3',
        'found',
        'SanDisk Ultra Dual Drive 64GB USB-C Flash Drive',
        'Found plugged into Workstation #14 in the 2nd floor ICT Lab after the morning programming session. Currently with the ICT Lab technician.',
        'electronics',
        'loc-ict-lab',
        18.1969,
        120.5929,
        '[]',
        '{"relayMode":true,"dropOffHub":"ICT / Computer Lab","methods":[]}',
        'open',
        NULL,
        'What is the folder name on the root of the drive or the color of the key ring attached?',
        'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2',
        '9a09f633e131251c48bc9b3486e391b993a9bd9d9e033c77c6fc8d8d09f61963',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-8 hours'),
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-7 hours'),
        NULL
    ),
    (
        'post-incat-4',
        'found',
        'Staedtler Drafting Tube & 24-inch T-Square',
        'Found leaning against the washbasin outside the Drafting & Civil Tech Studio. Turned over to the studio instructor.',
        'shop_tools',
        'loc-drafting-studio',
        18.1970,
        120.5927,
        '[]',
        '{"relayMode":true,"dropOffHub":"Drafting & Civil Tech Studio","methods":[]}',
        'open',
        NULL,
        NULL,
        NULL,
        '9a09f633e131251c48bc9b3486e391b993a9bd9d9e033c77c6fc8d8d09f61963',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'),
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-22 hours'),
        NULL
    ),
    (
        'post-incat-5',
        'found',
        'Keychain with 3 brass keys and woven Inabel strap',
        'Picked up near the main gate pedestrian lane. Safely deposited at the Guard House logbook.',
        'keys_lanyards',
        'loc-guard-house',
        18.1961,
        120.5923,
        '[]',
        '{"relayMode":true,"dropOffHub":"Guard House","methods":[]}',
        'open',
        NULL,
        NULL,
        NULL,
        '9a09f633e131251c48bc9b3486e391b993a9bd9d9e033c77c6fc8d8d09f61963',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days'),
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-46 hours'),
        NULL
    ),
    (
        'post-incat-6',
        'lost',
        'Casio fx-991EX ClassWiz Scientific Calculator (QR Tag #K9M4X7P2Q8LA)',
        'Has a small scratch near the SOLAR logo. Scanned and returned via Guidance Office within 2 hours!',
        'calculators',
        'loc-guidance',
        18.1965,
        120.5926,
        '[]',
        '{"relayMode":true,"dropOffHub":"Guidance Office","methods":[]}',
        'returned',
        'K9M4X7P2Q8LA',
        NULL,
        NULL,
        '9a09f633e131251c48bc9b3486e391b993a9bd9d9e033c77c6fc8d8d09f61963',
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days'),
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days'),
        strftime ('%Y-%m-%dT%H:%M:%SZ', 'now', '-44 hours')
    );