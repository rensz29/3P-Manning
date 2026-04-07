// ─── SHIFTS ───────────────────────────────────────────────────────────────────
export const SHIFTS = [
  { id: 1, label: 'S1', fullLabel: 'Shift 1', time: '06:00 – 14:00', icon: '🌅' },
  { id: 2, label: 'S2', fullLabel: 'Shift 2', time: '14:00 – 22:00', icon: '🌞' },
  { id: 3, label: 'S3', fullLabel: 'Shift 3', time: '22:00 – 06:00', icon: '🌙' },
];

// ─── PLANTS ───────────────────────────────────────────────────────────────────
// Each plant is a top-level "page" in the app
export const PLANTS = [
  { id: 'dressings', label: 'Dressings', icon: '🥗', color: '#0057B8' },
  { id: 'savoury',   label: 'Savoury',   icon: '🧂', color: '#b45309' },
];

// ═════════════════════════════════════════════════════════════════════════════
// DRESSINGS PLANT
// ═════════════════════════════════════════════════════════════════════════════

export const DRESSINGS_DEPARTMENTS = [
  { id: 'drs_flexibles', label: 'Flexibles', icon: '🏭', color: '#0057B8', plant: 'dressings' },
  { id: 'drs_rigids',    label: 'Rigids',    icon: '📦', color: '#7c3aed', plant: 'dressings' },
  { id: 'drs_process',   label: 'Process',   icon: '⚙️',  color: '#0f766e', plant: 'dressings' },
];

export const DRESSINGS_FLEXIBLES = [
  {
    id: 'volpak', label: 'Volpak', dept: 'drs_flexibles',
    skus: [
      { id: 'vp-100',  label: '100 mL', uom: 'mL', quota: 3 },
      { id: 'vp-130',  label: '130 mL', uom: 'mL', quota: 3 },
      { id: 'vp-205',  label: '205 mL', uom: 'mL', quota: 0 },
      { id: 'vp-220',  label: '220 mL', uom: 'mL', quota: 0 },
      { id: 'vp-470',  label: '470 mL', uom: 'mL', quota: 3 },
    ],
  },
  {
    id: 'boatopackH', label: 'BoatopackH', dept: 'drs_flexibles',
    skus: [
      { id: 'bph-10', label: '10 mL', uom: 'mL', quota: 7 },
      { id: 'bph-27', label: '27 mL', uom: 'mL', quota: 6 },
      { id: 'bph-40', label: '40 mL', uom: 'mL', quota: 6 },
      { id: 'bph-46', label: '46 mL', uom: 'mL', quota: 6 },
      { id: 'bph-72', label: '72 mL', uom: 'mL', quota: 5 },
      { id: 'bph-80', label: '80 mL', uom: 'mL', quota: 5 },
    ],
  },
  {
    id: 'boatopack2H', label: 'Boatopack2H', dept: 'drs_flexibles',
    skus: [
      { id: 'bp2-10', label: '10 mL', uom: 'mL', quota: 7 },
      { id: 'bp2-27', label: '27 mL', uom: 'mL', quota: 6 },
      { id: 'bp2-40', label: '40 mL', uom: 'mL', quota: 6 },
      { id: 'bp2-46', label: '46 mL', uom: 'mL', quota: 6 },
      { id: 'bp2-72', label: '72 mL', uom: 'mL', quota: 5 },
      { id: 'bp2-80', label: '80 mL', uom: 'mL', quota: 5 },
    ],
  },
  {
    id: 'ilapak', label: 'Ilapak', dept: 'drs_flexibles',
    skus: [
      { id: 'il-1L',  label: '1 L',    uom: 'L',  quota: 5 },
      { id: 'il-2.5', label: '2.5 kg', uom: 'kg', quota: 3 },
      { id: 'il-3',   label: '3 kg',   uom: 'kg', quota: 3 },
    ],
  },
  {
    id: 'doyNH', label: 'DoyNH', dept: 'drs_flexibles',
    remark: '3 manning if AkashNH running',
    skus: [
      { id: 'dn-220', label: '220 mL', uom: 'mL', quota: 2 },
      { id: 'dn-470', label: '470 mL', uom: 'mL', quota: 2 },
    ],
  },
  {
    id: 'akashNH', label: 'AkashNH', dept: 'drs_flexibles',
    skus: [
      { id: 'an-27', label: '27 mL', uom: 'mL', quota: 3 },
      { id: 'an-80', label: '80 mL', uom: 'mL', quota: 3 },
    ],
  },
  {
    id: 'linearDoy', label: 'LinearDoy', dept: 'drs_flexibles',
    skus: [
      { id: 'ld-200', label: '200 mL', uom: 'mL', quota: 3 },
      { id: 'ld-220', label: '220 mL', uom: 'mL', quota: 3 },
    ],
  },
  {
    id: 'akashH', label: 'AkashH', dept: 'drs_flexibles',
    skus: [
      { id: 'ah-27', label: '27 mL', uom: 'mL', quota: 4 },
      { id: 'ah-40', label: '40 mL', uom: 'mL', quota: 8 },
    ],
  },
  {
    id: 'mespack_drs', label: 'Mespack', dept: 'drs_flexibles',
    skus: [
      { id: 'ms-120', label: '120 mL', uom: 'mL', quota: 2 },
      { id: 'ms-220', label: '220 mL', uom: 'mL', quota: 2 },
      { id: 'ms-470', label: '470 mL', uom: 'mL', quota: 2 },
    ],
  },
];

export const DRESSINGS_RIGIDS = [
  {
    id: 'rigids_A', label: '_A', dept: 'drs_rigids',
    skus: [
      { id: 'ra-1',   label: '1 kg',   uom: 'kg', quota: 3 },
      { id: 'ra-2.6', label: '2.6 kg', uom: 'kg', quota: 4 },
      { id: 'ra-3L',  label: '3 L',    uom: 'L',  quota: 3 },
      { id: 'ra-3.5', label: '3.5 L',  uom: 'L',  quota: 3 },
    ],
  },
  {
    id: 'rigids_B', label: '_B', dept: 'drs_rigids',
    skus: [
      { id: 'rb-205', label: '205 mL', uom: 'mL', quota: 2 },
      { id: 'rb-220', label: '220 mL', uom: 'mL', quota: 2 },
      { id: 'rb-450', label: '450 mL', uom: 'mL', quota: 1 },
      { id: 'rb-470', label: '470 mL', uom: 'mL', quota: 1 },
      { id: 'rb-700', label: '700 mL', uom: 'mL', quota: 1 },
    ],
  },
  {
    id: 'rigids_EOL', label: 'EOL A/B', dept: 'drs_rigids',
    skus: [{ id: 'reol-all', label: 'All', uom: '', quota: 1 }],
  },
  {
    id: 'rigids_C1', label: '_C1', dept: 'drs_rigids',
    skus: [
      { id: 'rc-1',   label: '1 kg',  uom: 'kg', quota: 5 },
      { id: 'rc-3',   label: '3 kg',  uom: 'kg', quota: 2 },
      { id: 'rc-5.5', label: '5.5 L', uom: 'L',  quota: 1 },
      { id: 'rc-10',  label: '10 kg', uom: 'kg', quota: 3 },
      { id: 'rc-15',  label: '15 kg', uom: 'kg', quota: 4 },
      { id: 'rc-20',  label: '20 kg', uom: 'kg', quota: 3 },
    ],
  },
  {
    id: 'rigids_BNH', label: '_BottleNH', dept: 'drs_rigids',
    skus: [
      { id: 'rbn-220', label: '220 mL', uom: 'mL', quota: 2 },
      { id: 'rbn-470', label: '470 mL', uom: 'mL', quota: 2 },
    ],
  },
  {
    id: 'rigids_Serac', label: '_Serac', dept: 'drs_rigids',
    skus: [
      { id: 'rs-1',    label: '1 L',     uom: 'L',  quota: 4 },
      { id: 'rs-2.5',  label: '2.5 L',   uom: 'L',  quota: 4 },
      { id: 'rs-2.55', label: '2.55 L',  uom: 'L',  quota: 4 },
      { id: 'rs-2.65', label: '2.65 kg', uom: 'kg', quota: 4 },
      { id: 'rs-236',  label: '236 mL',  uom: 'mL', quota: 4 },
      { id: 'rs-250',  label: '250 mL',  uom: 'mL', quota: 4 },
      { id: 'rs-280',  label: '280 mL',  uom: 'mL', quota: 4 },
      { id: 'rs-290',  label: '290 mL',  uom: 'mL', quota: 4 },
    ],
  },
  {
    id: 'rigids_AllFill', label: '_AllFill', dept: 'drs_rigids',
    skus: [
      { id: 'raf-1',    label: '1 L/kg',  uom: 'L/kg', quota: 3 },
      { id: 'raf-2.5',  label: '2.5 L',   uom: 'L',    quota: 2 },
      { id: 'raf-2.55', label: '2.55 L',  uom: 'L',    quota: 2 },
      { id: 'raf-2.65', label: '2.65 kg', uom: 'kg',   quota: 2 },
      { id: 'raf-3',    label: '3 L',     uom: 'L',    quota: 2 },
      { id: 'raf-3.5',  label: '3.5 L',   uom: 'L',    quota: 3 },
    ],
  },
];

export const DRESSINGS_PROCESS = [
  { id: 'proc_CSO',       label: 'CSO',              dept: 'drs_process', skus: [{ id: 'p-cso', label: '—', uom: '', quota: 0 }] },
  { id: 'proc_Enrober',   label: 'Enrober',           dept: 'drs_process', skus: [{ id: 'p-enr', label: '—', uom: '', quota: 2 }] },
  { id: 'proc_CIPLight',  label: 'CIP/Light Oil',     dept: 'drs_process', skus: [{ id: 'p-cip', label: '—', uom: '', quota: 0 }] },
  { id: 'proc_Contherm',  label: 'Contherm',          dept: 'drs_process', skus: [{ id: 'p-con', label: '—', uom: '', quota: 0 }] },
  { id: 'proc_Starch',    label: 'Starch Dumping',    dept: 'drs_process', skus: [{ id: 'p-sta', label: '—', uom: '', quota: 2 }] },
  { id: 'proc_Selo',      label: 'Selo 3/5',          dept: 'drs_process', skus: [{ id: 'p-sel', label: '—', uom: '', quota: 2 }] },
  { id: 'proc_DispStarch',label: 'Dispensary Starch', dept: 'drs_process', skus: [{ id: 'p-dst', label: '—', uom: '', quota: 1 }] },
  { id: 'proc_FSDisp',    label: 'FS Dispensary',     dept: 'drs_process', skus: [{ id: 'p-fsd', label: '—', uom: '', quota: 1 }] },
  { id: 'proc_AzoFryma',  label: 'Azo/Fryma',         dept: 'drs_process', skus: [{ id: 'p-azo', label: '—', uom: '', quota: 1 }] },
  { id: 'proc_ESM',       label: 'ESM',               dept: 'drs_process', skus: [{ id: 'p-esm', label: '—', uom: '', quota: 2 }] },
  { id: 'proc_ProcFlexi', label: 'Process Flexi',     dept: 'drs_process', skus: [{ id: 'p-pfl', label: '—', uom: '', quota: 0 }] },
  { id: 'proc_GEA',       label: 'GEA',               dept: 'drs_process', skus: [{ id: 'p-gea', label: '—', uom: '', quota: 1 }] },
];

export const DRESSINGS_LINES_BY_DEPT = {
  drs_flexibles: DRESSINGS_FLEXIBLES,
  drs_rigids:    DRESSINGS_RIGIDS,
  drs_process:   DRESSINGS_PROCESS,
};

export const DRESSINGS_ALL_LINES = [
  ...DRESSINGS_FLEXIBLES,
  ...DRESSINGS_RIGIDS,
  ...DRESSINGS_PROCESS,
];

// ═════════════════════════════════════════════════════════════════════════════
// SAVOURY PLANT  — from images
// Departments: Powders | FS (Food Service) | Cubes | Process | Warehouse
// ═════════════════════════════════════════════════════════════════════════════

export const SAVOURY_DEPARTMENTS = [
  { id: 'sav_powders',   label: 'Powders',   icon: '🌾', color: '#b45309', plant: 'savoury' },
  { id: 'sav_fs',        label: 'FS',        icon: '🍽️', color: '#0891b2', plant: 'savoury' },
  { id: 'sav_cubes',     label: 'Cubes',     icon: '🧊', color: '#7c3aed', plant: 'savoury' },
  { id: 'sav_process',   label: 'Process',   icon: '⚙️',  color: '#0f766e', plant: 'savoury' },
  { id: 'sav_warehouse', label: 'Warehouse', icon: '🏬', color: '#64748b', plant: 'savoury' },
];

// ── Powders ────────────────────────────────────────────────────────────────────
// Image 1: Ilapak 2, Mespack, Uniclan, Universal 1, Universal 2
export const SAVOURY_POWDERS = [
  {
    id: 'sav_ilapak2', label: 'Ilapak 2', dept: 'sav_powders',
    skus: [
      { id: 'si2-11', label: '11', uom: '', quota: 0 }, // no quota listed
    ],
  },
  {
    id: 'sav_mespack', label: 'Mespack', dept: 'sav_powders',
    skus: [
      { id: 'sm-35',     label: '35',      uom: '', quota: 4 },
      { id: 'sm-37',     label: '37',      uom: '', quota: 4 },
      { id: 'sm-53',     label: '53',      uom: '', quota: 4 },
      { id: 'sm-55',     label: '55',      uom: '', quota: 4 },
      { id: 'sm-60',     label: '60',      uom: '', quota: 4 },
      { id: 'sm-62',     label: '62',      uom: '', quota: 4 },
      { id: 'sm-110550', label: '110/550', uom: '', quota: 6, remark: 'Gravy Mix' },
      { id: 'sm-160',    label: '160',     uom: '', quota: 6, remark: 'TSB Broth and Gabi FS' },
      { id: 'sm-800',    label: '800',     uom: '', quota: 6, remark: 'TSB Broth' },
    ],
  },
  {
    id: 'sav_uniclan', label: 'Uniclan', dept: 'sav_powders',
    skus: [
      { id: 'su-22', label: '22', uom: '', quota: 2 },
    ],
  },
  {
    id: 'sav_universal1', label: 'Universal 1', dept: 'sav_powders',
    skus: [
      { id: 'su1-11', label: '11', uom: '', quota: 1 },
      { id: 'su1-22', label: '22', uom: '', quota: 1 },
      { id: 'su1-23', label: '23', uom: '', quota: 1 },
    ],
  },
  {
    id: 'sav_universal2', label: 'Universal 2', dept: 'sav_powders',
    skus: [
      { id: 'su2-17', label: '17', uom: '', quota: 4 },
      { id: 'su2-44', label: '44', uom: '', quota: 0 },
    ],
  },
];

// ── FS (Food Service) ─────────────────────────────────────────────────────────
// Image 1: Cybertron, Ilapak 3, Band Sealer, Impulse Sealer, Tub Sealer,
//          FG Support, Stretch Wrapper, Mover, Postpacking (all PCL)
export const SAVOURY_FS = [
  {
    id: 'sav_cybertron', label: 'Cybertron', dept: 'sav_fs',
    skus: [
      { id: 'sc-1kg',   label: '1 kg',   uom: 'kg', quota: 1 },
      { id: 'sc-1.5kg', label: '1.5 kg', uom: 'kg', quota: 1 },
    ],
  },
  {
    id: 'sav_ilapak3', label: 'Ilapak 3', dept: 'sav_fs',
    skus: [
      { id: 'si3-300', label: '300',  uom: '', quota: 4 },
      { id: 'si3-400', label: '400',  uom: '', quota: 4 },
      { id: 'si3-700', label: '700',  uom: '', quota: 4 },
      { id: 'si3-1kg', label: '1 kg', uom: 'kg', quota: 4 },
    ],
  },
  {
    id: 'sav_bandsealer', label: 'Band Sealer', dept: 'sav_fs',
    remark: 'PCL',
    skus: [{ id: 'sbs-1kg', label: '1 kg', uom: 'kg', quota: 6 }],
  },
  {
    id: 'sav_impulsesealer', label: 'Impulse Sealer', dept: 'sav_fs',
    remark: 'PCL',
    skus: [{ id: 'sis-25kg', label: '25 kg', uom: 'kg', quota: 3 }],
  },
  {
    id: 'sav_tubsealer', label: 'Tub Sealer', dept: 'sav_fs',
    remark: 'PCL',
    skus: [{ id: 'sts-1.5kg', label: '1.5 kg', uom: 'kg', quota: 4 }],
  },
  {
    id: 'sav_fgsupport', label: 'FG Support', dept: 'sav_fs',
    remark: 'PCL',
    skus: [{ id: 'sfg-all', label: '—', uom: '', quota: 1 }],
  },
  {
    id: 'sav_stretchwrapper', label: 'Stretch Wrapper', dept: 'sav_fs',
    remark: 'PCL',
    skus: [{ id: 'ssw-all', label: '—', uom: '', quota: 1 }],
  },
  {
    id: 'sav_mover', label: 'Mover', dept: 'sav_fs',
    remark: 'PCL',
    skus: [{ id: 'smv-all', label: '—', uom: '', quota: 1 }],
  },
  {
    id: 'sav_postpacking', label: 'Postpacking', dept: 'sav_fs',
    remark: 'PCL',
    skus: [{ id: 'spp-all', label: '—', uom: '', quota: 4 }],
  },
];

// ── Cubes ──────────────────────────────────────────────────────────────────────
// Image 2: FD12A, FD12B, FD220, FD8A, FD8B, FD8C, FD8D, Benhil, Reliever, Xray
export const SAVOURY_CUBES = [
  {
    id: 'sav_fd12a', label: 'FD12A', dept: 'sav_cubes',
    skus: [
      { id: 'fd12a-savers', label: 'Savers', uom: '', quota: 0 },
      { id: 'fd12a-pantry', label: 'Pantry', uom: '', quota: 0 },
    ],
  },
  {
    id: 'sav_fd12b', label: 'FD12B', dept: 'sav_cubes',
    remark: 'If diff SKU with FD8B; same SKU no support needed',
    skus: [
      { id: 'fd12b-singles', label: 'Singles', uom: '', quota: 1 },
      { id: 'fd12b-pantry',  label: 'Pantry',  uom: '', quota: 1 },
    ],
  },
  {
    id: 'sav_fd220', label: 'FD220', dept: 'sav_cubes',
    skus: [
      { id: 'fd220-sup', label: 'SUP', uom: '', quota: 4 },
    ],
  },
  {
    id: 'sav_fd8a', label: 'FD8A', dept: 'sav_cubes',
    skus: [
      { id: 'fd8a-pantry', label: 'Pantry', uom: '', quota: 0 },
    ],
  },
  {
    id: 'sav_fd8b', label: 'FD8B', dept: 'sav_cubes',
    remark: 'If diff SKU with FD12B; same SKU no support needed',
    skus: [
      { id: 'fd8b-singles', label: 'Singles', uom: '', quota: 1 },
    ],
  },
  {
    id: 'sav_fd8c', label: 'FD8C', dept: 'sav_cubes',
    remark: 'If diff SKU with FD8D; same SKU no support needed',
    skus: [
      { id: 'fd8c-singles', label: 'Singles', uom: '', quota: 1 },
      { id: 'fd8c-duo',     label: 'Duo',     uom: '', quota: 1 },
    ],
  },
  {
    id: 'sav_fd8d', label: 'FD8D', dept: 'sav_cubes',
    remark: 'If diff SKU with FD8C; same SKU no support needed',
    skus: [
      { id: 'fd8d-singles', label: 'Singles', uom: '', quota: 1 },
      { id: 'fd8d-duo',     label: 'Duo',     uom: '', quota: 1 },
    ],
  },
  {
    id: 'sav_benhil', label: 'Benhil', dept: 'sav_cubes',
    skus: [
      { id: 'sbh-singles', label: 'Singles', uom: '', quota: 1 },
    ],
  },
  {
    id: 'sav_reliever', label: 'Reliever', dept: 'sav_cubes',
    remark: 'for FD220',
    skus: [{ id: 'srel-all', label: '—', uom: '', quota: 1 }],
  },
  {
    id: 'sav_xray', label: 'Xray', dept: 'sav_cubes',
    skus: [{ id: 'sxr-all', label: '—', uom: '', quota: 1 }],
  },
];

// ── Process ────────────────────────────────────────────────────────────────────
// Image 3 (Process rows)
export const SAVOURY_PROCESS = [
  { id: 'sp_amixon2f',   label: 'Amixon 2F',                   dept: 'sav_process', skus: [{ id: 'sp-am2f',  label: '—', uom: '', quota: 1 }] },
  { id: 'sp_amixon1f',   label: 'Amixon 1F',                   dept: 'sav_process', skus: [{ id: 'sp-am1f',  label: '—', uom: '', quota: 1 }] },
  { id: 'sp_fatmelting', label: 'Fat Melting',                  dept: 'sav_process', skus: [{ id: 'sp-fat',   label: '—', uom: '', quota: 1 }] },
  { id: 'sp_tipping1',   label: 'Tipping Station 1',           dept: 'sav_process', skus: [{ id: 'sp-tip1',  label: '—', uom: '', quota: 1 }] },
  { id: 'sp_tipping2',   label: 'Tipping Station 2',           dept: 'sav_process', skus: [{ id: 'sp-tip2',  label: '—', uom: '', quota: 1 }] },
  { id: 'sp_totebin',    label: 'Totebin Discharge',            dept: 'sav_process', skus: [{ id: 'sp-tot',   label: '—', uom: '', quota: 1 }] },
  { id: 'sp_hsm',        label: 'HSM',                          dept: 'sav_process', skus: [{ id: 'sp-hsm',   label: '—', uom: '', quota: 1 }] },
  { id: 'sp_zeta',       label: 'Zeta',                         dept: 'sav_process', skus: [{ id: 'sp-zeta',  label: '—', uom: '', quota: 1 }] },
  { id: 'sp_nonallergen',label: 'Non-Allergen',                 dept: 'sav_process', skus: [{ id: 'sp-nona',  label: '—', uom: '', quota: 2 }] },
  { id: 'sp_allergen',   label: 'Allergen',                     dept: 'sav_process', skus: [{ id: 'sp-aller', label: '—', uom: '', quota: 2 }] },
  { id: 'sp_batchprep',  label: 'Batch Prep',                   dept: 'sav_process', skus: [{ id: 'sp-bprep', label: '—', uom: '', quota: 2 }] },
  { id: 'sp_bbb',        label: 'BBB',                          dept: 'sav_process', skus: [{ id: 'sp-bbb',   label: '—', uom: '', quota: 4 }] },
  { id: 'sp_bbbrelief',  label: 'BBB Reliever / Cleaning Sup.', dept: 'sav_process', skus: [{ id: 'sp-bbbr',  label: '—', uom: '', quota: 1 }] },
  { id: 'sp_elevator',   label: 'Elevator',                     dept: 'sav_process', skus: [{ id: 'sp-elev',  label: '—', uom: '', quota: 3 }] },
];

// ── Warehouse ──────────────────────────────────────────────────────────────────
// Image 3 (Warehouse rows)
export const SAVOURY_WAREHOUSE = [
  { id: 'sw_eolpal',    label: 'EOL Palletizer',   dept: 'sav_warehouse', skus: [{ id: 'sw-eolp',  label: '—', uom: '', quota: 3 }] },
  { id: 'sw_matreq',   label: 'Material Requestor',dept: 'sav_warehouse', skus: [{ id: 'sw-matr',  label: '—', uom: '', quota: 3 }] },
  { id: 'sw_waste',    label: 'Waste Disposal',     dept: 'sav_warehouse', skus: [{ id: 'sw-wast',  label: '—', uom: '', quota: 1 }] },
  { id: 'sw_teamlead', label: 'HRTA Team Lead',     dept: 'sav_warehouse', skus: [{ id: 'sw-tl',    label: '—', uom: '', quota: 1 }] },
];

export const SAVOURY_LINES_BY_DEPT = {
  sav_powders:   SAVOURY_POWDERS,
  sav_fs:        SAVOURY_FS,
  sav_cubes:     SAVOURY_CUBES,
  sav_process:   SAVOURY_PROCESS,
  sav_warehouse: SAVOURY_WAREHOUSE,
};

export const SAVOURY_ALL_LINES = [
  ...SAVOURY_POWDERS,
  ...SAVOURY_FS,
  ...SAVOURY_CUBES,
  ...SAVOURY_PROCESS,
  ...SAVOURY_WAREHOUSE,
];

// ═════════════════════════════════════════════════════════════════════════════
// COMBINED (used by analytics, turnstile, etc.)
// ═════════════════════════════════════════════════════════════════════════════

// Keep legacy exports so existing components don't break
export const DEPARTMENTS      = DRESSINGS_DEPARTMENTS;
export const FLEXIBLES_LINES  = DRESSINGS_FLEXIBLES;
export const RIGIDS_LINES     = DRESSINGS_RIGIDS;
export const PROCESS_LINES    = DRESSINGS_PROCESS;
export const LINES_BY_DEPT    = DRESSINGS_LINES_BY_DEPT;
export const ALL_LINES        = [...DRESSINGS_ALL_LINES, ...SAVOURY_ALL_LINES];

// ─── EMPLOYEE COLORS ──────────────────────────────────────────────────────────
export const EMPLOYEE_COLORS = [
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', dot: '#3B82F6' },
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', dot: '#22C55E' },
  { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', dot: '#F59E0B' },
  { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', dot: '#F43F5E' },
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9', dot: '#8B5CF6' },
  { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', dot: '#F97316' },
  { bg: '#F0FDFA', border: '#99F6E4', text: '#0F766E', dot: '#14B8A6' },
  { bg: '#FDF4FF', border: '#F5D0FE', text: '#A21CAF', dot: '#D946EF' },
];
