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
    (
        'loc-guard-house',
        'Guard House',
        'GATE',
        1,
        18.203499,
        120.592695,
        'Guard House. Official drop-off point for found items.'
    ),
    (
        'loc-admin',
        'Administration Building',
        'ADMIN',
        1,
        18.203466,
        120.592876,
        'Administration Building. Official drop-off point for found items.'
    ),
    (
        'loc-guidance',
        'Guidance Office',
        'GUIDANCE',
        1,
        18.203874,
        120.593395,
        'Guidance Office, JHS building. Official drop-off point for found items.'
    ),
    (
        'loc-ict-jhs',
        'ICT (JHS)',
        'ICT-JHS',
        0,
        18.203857,
        120.592504,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-ict-shs',
        'ICT (SHS)',
        'ICT-SHS',
        0,
        18.203611,
        120.592416,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-garments',
        'Garments',
        'GARMENTS',
        0,
        18.204366,
        120.592019,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-practical-arts',
        'Practical Arts',
        'PRACTICAL',
        0,
        18.204866,
        120.592829,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-science',
        'Science Building',
        'SCIENCE',
        0,
        18.204721,
        120.59212,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-centennial-park',
        'Centennial Park',
        'PARK',
        0,
        18.204481,
        120.592751,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    );