'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';

type Airport = {
  id: number;
  iata: string;
  icao?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lon?: number | null;
  timezone?: string | null;
};

type AuditLog = {
  id: number;
  iata: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  changedAt: string;
};

type Snapshot = {
  id: number;
  iata: string;
  data: any;
  changedBy?: string | null;
  changedAt: string;
};

type tParams = Promise<{ iataSlug: string }>;

export default function AirportDetail({ params }: { params: tParams }) {
  const { iataSlug }: { iataSlug: string } = use(params);
  const iata = (iataSlug || '').toUpperCase();
  const [airport, setAirport] = useState<Airport | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [rollbackAt, setRollbackAt] = useState<string>('');

  // filters
  const [fField, setFField] = useState<string>('');
  const [fUser, setFUser] = useState<string>('');
  const [fFrom, setFFrom] = useState<string>('');
  const [fTo, setFTo] = useState<string>('');

  const fieldsInLogs = useMemo(() => Array.from(new Set(logs.map(l => l.field))).sort(), [logs]);
  const [diffSnapId, setDiffSnapId] = useState<number | null>(null);
  const [diffA, setDiffA] = useState<number | null>(null);
  const [diffB, setDiffB] = useState<number | null>(null);
  const selectedSnapshot = useMemo(() => snaps.find(s => s.id === diffSnapId) || null, [snaps, diffSnapId]);
  const snapA = useMemo(() => snaps.find(s => s.id === diffA) || null, [snaps, diffA]);
  const snapB = useMemo(() => snaps.find(s => s.id === diffB) || null, [snaps, diffB]);

  async function loadAll() {
    const r1 = await fetch(`/api/airports/${iata}`);
    if (r1.ok) setAirport(await r1.json());
    await loadAudit();
    const r3 = await fetch(`/api/airports/${iata}/snapshots?take=50`);
    if (r3.ok) setSnaps(await r3.json());
  }

  async function loadAudit() {
    const params = new URLSearchParams();
    if (fField) params.set('field', fField);
    if (fUser) params.set('user', fUser);
    if (fFrom) params.set('from', fFrom);
    if (fTo) params.set('to', fTo);
    const r2 = await fetch(`/api/airports/${iata}/audit?${params.toString()}`);
    if (r2.ok) setLogs(await r2.json());
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iata]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('Saving...');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const payload: any = {};
    for (const [k, v] of formData.entries()) {
      if (k === 'reason') continue; // we append after loop
      if (v === '') continue;
      if (k === 'lat' || k === 'lon') payload[k] = parseFloat(String(v));
      else payload[k] = v;
    }
    payload.reason = String(formData.get('reason') || '').trim();

    try {
      const r = await fetch(`/api/airports/${iata}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Update failed');
      setAirport(data);
      setMsg('Saved.');
      await loadAudit();
      const r3 = await fetch(`/api/airports/${iata}/snapshots?take=50`);
      if (r3.ok) setSnaps(await r3.json());
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  }

  async function rollback(id: number) {
    setMsg('Rolling back field...');
    try {
      const _reason = prompt('Reason for rollback?'); if (!_reason) { setMsg('Cancelled — reason required.'); return; }
      const r = await fetch(`/api/airports/${iata}/rollback?id=${id}&reason=${encodeURIComponent(_reason)}`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Rollback failed');
      setMsg('Field rolled back.');
      await loadAll();
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  }

  async function rollbackToTimestamp() {
    if (!rollbackAt) { setMsg('Pick a timestamp.'); return; }
    setMsg('Rolling back full record...');
    try {
      const _reason = prompt('Reason for rollback-to?'); if (!_reason) { setMsg('Cancelled — reason required.'); return; }
      const r = await fetch(`/api/airports/${iata}/rollback-to?at=${encodeURIComponent(rollbackAt)}&reason=${encodeURIComponent(_reason)}`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Rollback-to failed');
      setMsg('Full record rolled back.');
      await loadAll();
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  }

  async function restoreSnapshot(id: number) {
    setMsg('Restoring snapshot...');
    try {
      const _reason = prompt('Reason for restoring snapshot?'); if (!_reason) { setMsg('Cancelled — reason required.'); return; }
      const r = await fetch(`/api/airports/${iata}/restore?id=${id}&reason=${encodeURIComponent(_reason)}`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Restore failed');
      setMsg('Snapshot restored.');
      await loadAll();
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  }

  function valueFor(field: string, obj: any): string {
    try {
      const v = obj?.[field];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return '';
      return String(v);
    } catch (error) {
      return '';
    }
  }

  if (!airport) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Link href="/admin/airports" className="text-sm underline">← Back</Link>
        <div className="mt-4">Loading...</div>
      </div>
    );
  }

  const [lastRestore, setLastRestore] = useState<{ field: string, prev: any } | null>(null);

  async function restoreField(field: string, prev: any) {
    setMsg('Restoring field...');
    try {
      const _reason = prompt(`Reason for restoring field "${field}"?`);
      if (!_reason) {
        setMsg('Cancelled — reason required.');
        return;
      }
      const payload: any = { [field]: prev, reason: _reason };
      const r = await fetch(`/api/airports/${iata}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Restore failed');
      setAirport(data);
      setMsg('Field restored.');
      setLastRestore({ field, prev });
      await loadAudit();
      const r3 = await fetch(`/api/airports/${iata}/snapshots?take=50`);
      if (r3.ok) setSnaps(await r3.json());
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  }

  const [jsonViewSnap, setJsonViewSnap] = useState<Snapshot | null>(null);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Edit Airport — {airport.iata}</h1>
        <Link href="/admin/airports" className="text-sm px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800">Back to list</Link>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">IATA</label>
          <input value={valueFor('iata', airport)} readOnly className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">ICAO</label>
          <input name="icao" defaultValue={valueFor('icao', airport)} className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Name</label>
          <input name="name" defaultValue={valueFor('name', airport)} className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">City</label>
          <input name="city" defaultValue={valueFor('city', airport)} className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Country</label>
          <input name="country" defaultValue={valueFor('country', airport)} className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Timezone (IANA)</label>
          <input name="timezone" placeholder="e.g. America/Los_Angeles" defaultValue={valueFor('timezone', airport)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Latitude</label>
          <input name="lat" type="number" step="0.000001" defaultValue={valueFor('lat', airport)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Longitude</label>
          <input name="lon" type="number" step="0.000001" defaultValue={valueFor('lon', airport)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Reason (required)</label>
          <input name="reason" required placeholder="Describe why you are changing this airport..." className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        </div>

        <div className="md:col-span-2 flex items-center gap-2 mt-2">
          <button className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600">Save</button>
          {msg && <span className="text-sm text-slate-300">{msg}</span>}
          {lastRestore && (
            <button onClick={async () => { await restoreField(lastRestore.field, lastRestore.prev); setLastRestore(null); }} className="text-xs ml-2 px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">Undo last field restore</button>
          )}
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Audit Log</h2>

        <div className="rounded-xl border border-slate-800 p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs mb-1">Field</label>
              <select value={fField} onChange={e => setFField(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-2">
                <option value="">(any)</option>
                {fieldsInLogs.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">User contains</label>
              <input value={fUser} onChange={e => setFUser(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-2" />
            </div>
            <div>
              <label className="block text-xs mb-1">From</label>
              <input type="datetime-local" value={fFrom} onChange={e => setFFrom(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-2" />
            </div>
            <div>
              <label className="block text-xs mb-1">To</label>
              <input type="datetime-local" value={fTo} onChange={e => setFTo(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-2" />
            </div>
          </div>
          <div className="mt-2">
            <button onClick={loadAudit} className="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800">Apply filters</button>
          </div>
        </div>

        <div className="overflow-auto border border-slate-800 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Field</th>
                <th className="px-3 py-2 text-left">Old</th>
                <th className="px-3 py-2 text-left">New</th>
                <th className="px-3 py-2 text-left">By</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{new Date(l.changedAt).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{l.field}</td>
                  <td className="px-3 py-2">{l.oldValue ?? ''}</td>
                  <td className="px-3 py-2">{l.newValue ?? ''}</td>
                  <td className="px-3 py-2">{l.changedBy ?? ''}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => rollback(l.id)} className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800">
                      Roll back field
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 p-4">
          <div className="font-medium mb-2">Full-record rollback</div>
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
            <input type="datetime-local" value={rollbackAt} onChange={e => setRollbackAt(e.target.value)}
              className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
            <button onClick={rollbackToTimestamp} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500">
              Roll back record to timestamp
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Pick a past timestamp (your local time).</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Snapshots</h2>
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-400">Diff two snapshots:</div>
            <select value={diffA ?? ''} onChange={(e) => setDiffA(e.target.value ? Number(e.target.value) : null)} className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-2">
              <option value="">(A)</option>
              {snaps.map(s => <option key={s.id} value={s.id}>#{s.id}</option>)}
            </select>
            <span className="text-slate-500">vs</span>
            <select value={diffB ?? ''} onChange={(e) => setDiffB(e.target.value ? Number(e.target.value) : null)} className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-2">
              <option value="">(B)</option>
              {snaps.map(s => <option key={s.id} value={s.id}>#{s.id}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-auto border border-slate-800 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">By</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {snaps.map(s => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{new Date(s.changedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{s.changedBy ?? ''}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => restoreSnapshot(s.id)} className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800">
                      Restore to this snapshot
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedSnapshot && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Diff vs current — Snapshot #{selectedSnapshot.id} ({new Date(selectedSnapshot.changedAt).toLocaleString()})</div>
              <button onClick={() => setDiffSnapId(null)} className="text-sm px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800">Close</button>
            </div>
            {/* Placeholder diff; detailed row diffs injected in earlier step if present */}
          </div>
        )}

        {snapA && snapB && (
          <div className="mt-4">
            <div className="font-medium mb-2">Snapshot-to-snapshot diff — #{snapA.id} vs #{snapB.id}</div>
            {/* Placeholder diff */}
          </div>
        )}

        <p className="text-xs text-slate-400">Snapshots are captured automatically after each change/rollback/restore.</p>

        {jsonViewSnap && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-auto p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Snapshot #{jsonViewSnap.id} JSON — {new Date(jsonViewSnap.changedAt).toLocaleString()}</div>
                <button onClick={() => setJsonViewSnap(null)} className="text-sm px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800">Close</button>
              </div>
              <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(jsonViewSnap.data, null, 2)}</pre>
            </div>
          </div>
        )}

      </section>
    </div>
  );
}
