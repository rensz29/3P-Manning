import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ═════════════════════════════════════════════════════════════════════════════
// useTurnstile.js
//
// PURPOSE:
//   Reads the turnstile system's database (READ-ONLY) via your backend API.
//   The turnstile system owns its DB — this hook only queries it.
//   Polls every N seconds, compares who is physically on-site vs who is
//   scheduled for the current shift, then surfaces excess employees.
//
// ARCHITECTURE:
//   Turnstile Hardware → Turnstile DB (SQL) → Your Backend → This hook (polls)
//
// ─── BACKEND ENDPOINT YOU NEED TO CREATE ─────────────────────────────────────
//
//   GET /api/turnstile/present
//   Returns: JSON array of all employees who have scanned today
//
//   Response shape (one object per employee):
//   [
//     {
//       "employee_id" : "UN-1001",   // must match employee IDs in your HR/schedule system
//       "full_name"   : "Ana Reyes",
//       "badge_no"    : "UN-1001",
//       "status"      : 1,           // 1 = currently IN facility, 0 = OUT
//       "entry_time"  : "06:03"      // time of last IN scan, null if status = 0
//     }
//   ]
//
// ─── BACKEND SQL (adapt table/column names to your schema) ───────────────────
//
//   -- Returns the LATEST turnstile scan per employee for today.
//   -- Only employees who scanned at least once today are included.
//   -- "Not in result" = never scanned = treat as status 0 on the frontend.
//
//   SELECT
//     e.employee_id,
//     e.full_name,
//     e.badge_no,
//     t.status,
//     TIME_FORMAT(t.scan_time, '%H:%i') AS entry_time
//   FROM employees e
//   INNER JOIN (
//     SELECT
//       employee_id,
//       status,
//       scan_time,
//       ROW_NUMBER() OVER (
//         PARTITION BY employee_id
//         ORDER BY scan_time DESC
//       ) AS rn
//     FROM turnstile_logs
//     WHERE DATE(scan_time) = CURDATE()
//   ) t ON e.employee_id = t.employee_id AND t.rn = 1
//   ORDER BY t.scan_time ASC;
//
// ─── FIELD MAPPING ───────────────────────────────────────────────────────────
//   DB column      → hook field
//   employee_id    → id          (must match IDs used in useAssignment)
//   full_name      → name
//   badge_no       → badgeNo
//   status         → status      (1 = IN, 0 = OUT — no transformation needed)
//   entry_time     → entryTime   ("HH:mm" string or null)
//
// ═════════════════════════════════════════════════════════════════════════════

const POLL_INTERVAL_MS  = 5000;            // poll every 5 seconds
const TURNSTILE_API_URL = '/api/turnstile/present';

// ─── Set USE_MOCK = false when your backend endpoint is ready ─────────────────
const USE_MOCK = true;

const MOCK_ROWS = [
  { id: 'emp-0',  name: 'Ana Reyes',       badgeNo: 'UN-1001', status: 1, entryTime: '05:48' },
  { id: 'emp-1',  name: 'Ben Torres',      badgeNo: 'UN-1002', status: 1, entryTime: '05:52' },
  { id: 'emp-2',  name: 'Carlo Musa',      badgeNo: 'UN-1003', status: 1, entryTime: '05:55' },
  { id: 'emp-3',  name: 'Diana Santos',    badgeNo: 'UN-1004', status: 1, entryTime: '05:57' },
  { id: 'emp-4',  name: 'Edwin Perez',     badgeNo: 'UN-1005', status: 1, entryTime: '06:01' },
  { id: 'emp-5',  name: 'Faye Lim',        badgeNo: 'UN-1006', status: 1, entryTime: '06:03' },
  { id: 'emp-6',  name: 'Greg Ordo',       badgeNo: 'UN-1007', status: 0, entryTime: null    },
  { id: 'emp-7',  name: 'Hannah Kim',      badgeNo: 'UN-1008', status: 1, entryTime: '06:05' },
  { id: 'emp-8',  name: 'Ivan Cruz',       badgeNo: 'UN-1009', status: 1, entryTime: '06:07' },
  { id: 'emp-9',  name: 'Jana Bato',       badgeNo: 'UN-1010', status: 0, entryTime: null    },
  { id: 'emp-10', name: 'Karl Nilo',       badgeNo: 'UN-1011', status: 1, entryTime: '06:10' },
  { id: 'emp-11', name: 'Lena Franco',     badgeNo: 'UN-1012', status: 1, entryTime: '06:12' },
  { id: 'emp-12', name: 'Marco Vera',      badgeNo: 'UN-1013', status: 1, entryTime: '06:14' },
  { id: 'emp-13', name: 'Nina Quito',      badgeNo: 'UN-1014', status: 1, entryTime: '06:15' },
  { id: 'emp-14', name: 'Oscar Dela',      badgeNo: 'UN-1015', status: 0, entryTime: null    },
  { id: 'emp-15', name: 'Pia Waldo',       badgeNo: 'UN-1016', status: 1, entryTime: '06:18' },
  { id: 'emp-16', name: 'Rex Javier',      badgeNo: 'UN-1017', status: 1, entryTime: '06:20' },
  { id: 'emp-17', name: 'Sara Ureta',      badgeNo: 'UN-1018', status: 1, entryTime: '06:21' },
  { id: 'emp-18', name: 'Tom Hizon',       badgeNo: 'UN-1019', status: 1, entryTime: '06:23' },
  { id: 'emp-19', name: 'Uma Xiao',        badgeNo: 'UN-1020', status: 0, entryTime: null    },
  { id: 'emp-20', name: 'Victor Yap',      badgeNo: 'UN-1021', status: 1, entryTime: '06:25' },
  { id: 'emp-21', name: 'Wanda Zapata',    badgeNo: 'UN-1022', status: 1, entryTime: '06:27' },
];

// ─── 7-day excess history ─────────────────────────────────────────────────────
// Replace with a real backend query in production. Suggested SQL:
//
//   SELECT
//     DATE(detected_at)           AS log_date,
//     shift_id,
//     COUNT(DISTINCT employee_id) AS excess_count
//   FROM excess_log
//   WHERE detected_at >= CURDATE() - INTERVAL 7 DAY
//   GROUP BY log_date, shift_id
//   ORDER BY log_date ASC;
//
export const EXCESS_HISTORY = [
  { day: 'Mon', shift1: 3, shift2: 1, shift3: 2 },
  { day: 'Tue', shift1: 5, shift2: 2, shift3: 1 },
  { day: 'Wed', shift1: 2, shift2: 4, shift3: 3 },
  { day: 'Thu', shift1: 1, shift2: 1, shift3: 0 },
  { day: 'Fri', shift1: 6, shift2: 3, shift3: 2 },
  { day: 'Sat', shift1: 4, shift2: 2, shift3: 1 },
  { day: 'Sun', shift1: 4, shift2: 0, shift3: 2 },
];

// ─── Internal: fetch + normalise from backend ─────────────────────────────────
async function fetchTurnstileRows() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 80)); // simulate latency
    return MOCK_ROWS;
  }

  const res = await fetch(TURNSTILE_API_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Uncomment and set your auth header:
      // 'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error(`Turnstile API ${res.status}: ${res.statusText}`);

  const data = await res.json();

  // Normalise backend field names → the shape this hook expects
  return data.map(row => ({
    id:        row.employee_id ?? row.id,
    name:      row.full_name   ?? row.name,
    badgeNo:   row.badge_no    ?? row.badgeNo,
    status:    Number(row.status),          // ensure numeric 1 or 0
    entryTime: row.entry_time  ?? row.entryTime ?? null,
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// Hook
// ═════════════════════════════════════════════════════════════════════════════
export function useTurnstile(scheduledIds) {
  const [rows, setRows]               = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isError, setIsError]         = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const fresh = await fetchTurnstileRows();
      setRows(fresh);
      setIsError(false);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useTurnstile] Poll failed:', err.message);
      setIsError(true);
      // Keep last known data visible — don't blank the UI on a transient error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mount: fetch immediately, then start the recurring poll
  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [poll]);

  // ── Derived values ────────────────────────────────────────────────────────
  // Recalculate whenever raw rows OR the schedule changes

  // Everyone physically in the building (status = 1)
  const presentEmployees = useMemo(
    () => rows.filter(e => e.status === 1),
    [rows]
  );

  // Scheduled AND present — these are the "normal" employees
  const scheduledPresent = useMemo(
    () => presentEmployees.filter(e => scheduledIds.has(e.id)),
    [presentEmployees, scheduledIds]
  );

  // Scheduled but NOT yet present — late / absent
  const scheduledAbsent = useMemo(
    () => rows.filter(e => scheduledIds.has(e.id) && e.status !== 1),
    [rows, scheduledIds]
  );

  // ── CORE METRIC ──────────────────────────────────────────────────────────
  // Present on-site but NOT in the shift schedule → these are the excess employees
  const excessEmployees = useMemo(
    () => presentEmployees.filter(e => !scheduledIds.has(e.id)),
    [presentEmployees, scheduledIds]
  );

  return {
    // Data
    presentEmployees,
    scheduledPresent,
    scheduledAbsent,
    excessEmployees,
    // Counts
    totalIn:      presentEmployees.length,
    totalExcess:  excessEmployees.length,
    // Fetch state
    isLoading,
    isError,
    lastUpdated,
    refetch: poll,   // call to force an immediate refresh
  };
}
