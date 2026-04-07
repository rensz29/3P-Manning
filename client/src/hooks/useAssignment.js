import { useState, useCallback, useMemo } from 'react';
import { ALL_LINES, SHIFTS, EMPLOYEE_COLORS } from '../data/lineData';

// ─── Mock HRTA employees — replace with real API fetch ───────────────────────
const MOCK_EMPLOYEES = [
  'Ana Reyes','Ben Torres','Carlo Musa','Diana Santos','Edwin Perez',
  'Faye Lim','Greg Ordo','Hannah Kim','Ivan Cruz','Jana Bato',
  'Karl Nilo','Lena Franco','Marco Vera','Nina Quito','Oscar Dela',
  'Pia Waldo','Rex Javier','Sara Ureta','Tom Hizon','Uma Xiao',
  'Victor Yap','Wanda Zapata',
].map((name, i) => ({
  id: `emp-${i}`,
  name,
  department: 'HRTA',
  type: '3P',
  colorIndex: i % EMPLOYEE_COLORS.length,
}));

function buildEmpty() {
  const map = {};
  ALL_LINES.forEach(line =>
    line.skus.forEach(sku => {
      map[sku.id] = {};
      SHIFTS.forEach(sh => { map[sku.id][sh.id] = []; });
    })
  );
  return map;
}

export function useAssignment() {
  const [employees]   = useState(MOCK_EMPLOYEES);
  const [assignments, setAssignments] = useState(buildEmpty);
  const [dragEmpId, setDragEmpId]     = useState(null);

  // All emp IDs assigned anywhere across all shifts
  const assignedIds = useMemo(() => new Set(
    Object.values(assignments).flatMap(bs => Object.values(bs).flat())
  ), [assignments]);

  // Emp IDs scheduled for a specific shift (used by turnstile hook)
  const getScheduledIdsForShift = useCallback((shiftId) => new Set(
    Object.values(assignments).flatMap(bs => bs[shiftId] ?? [])
  ), [assignments]);

  const startDrag = useCallback(id => setDragEmpId(id), []);
  const endDrag   = useCallback(() => setDragEmpId(null), []);

  const assignEmployee = useCallback((skuId, shiftId, quota) => {
    if (!dragEmpId || assignedIds.has(dragEmpId) || quota === 0) return;
    setAssignments(prev => {
      const cur = prev[skuId]?.[shiftId] ?? [];
      if (cur.length >= quota) return prev;
      return { ...prev, [skuId]: { ...prev[skuId], [shiftId]: [...cur, dragEmpId] } };
    });
  }, [dragEmpId, assignedIds]);

  const unassignEmployee = useCallback((empId, skuId, shiftId) => {
    setAssignments(prev => ({
      ...prev,
      [skuId]: { ...prev[skuId], [shiftId]: prev[skuId][shiftId].filter(id => id !== empId) },
    }));
  }, []);

  const getAssignedEmployees = useCallback((skuId, shiftId) => {
    const ids = assignments[skuId]?.[shiftId] ?? [];
    return ids.map(id => employees.find(e => e.id === id)).filter(Boolean);
  }, [assignments, employees]);

  const getShiftTotal = useCallback(shiftId =>
    Object.values(assignments).reduce((s, bs) => s + (bs[shiftId]?.length ?? 0), 0),
  [assignments]);

  const getShiftRequired = useCallback(() =>
    ALL_LINES.reduce((s, l) => s + l.skus.reduce((s2, sk) => s2 + sk.quota, 0), 0),
  []);

  const getDeptShiftRequired = useCallback((deptLines) =>
    deptLines.reduce((s, l) => s + l.skus.reduce((s2, sk) => s2 + sk.quota, 0), 0),
  []);

  const getDeptShiftTotal = useCallback((deptLines, shiftId) =>
    deptLines.reduce((s, l) =>
      s + l.skus.reduce((s2, sk) => s2 + (assignments[sk.id]?.[shiftId]?.length ?? 0), 0), 0),
  [assignments]);

  return {
    employees, assignments, assignedIds, dragEmpId,
    startDrag, endDrag,
    assignEmployee, unassignEmployee, getAssignedEmployees,
    getShiftTotal, getShiftRequired, getDeptShiftRequired, getDeptShiftTotal,
    getScheduledIdsForShift,
  };
}
