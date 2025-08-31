'use client';

import { useState } from 'react';

type Mode = 'upsert' | 'replace';

export default function AdminHome() {
  // one-shot reseed status
  const [msg, setMsg] = useState<string>('');

  // chunked reseed controls
  const [limit, setLimit] = useState<number>(500);
  const [mode, setMode] = useState<Mode>('upsert');
  const [running, setRunning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [sendAuth, setSendAuth] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  async function callReseed(reset: boolean) {
    setMsg('Running reseed...');
    try {
      const res = await fetch(`/api/reseed${reset ? '?reset=true' : ''}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Reseed failed');
      setMsg(`OK — count: ${data.count} ${data.reset ? '(reset)' : ''}`);
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  }

  async function runChunkedReseed() {
    setRunning(true);
    setLog([]);
    setOffset(0);
    setTotal(0);

    try {
      let off = 0;
      let done = false;

      while (!done) {
        const headers: Record<string, string> = {};
        if (sendAuth && user && pass) {
          headers['Authorization'] = 'Basic ' + btoa(`${user}:${pass}`);
        }

        const url = `/api/reseed?offset=${off}&limit=${limit}&mode=${mode}`;
        const res = await fetch(url, { method: 'POST', headers });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || 'Reseed error');

        setTotal(data.total ?? 0);
        setOffset(data.nextOffset ?? off);
        setLog((l) => [...l, `Chunk @${off}: processed ${data.processed} / total ${data.total}`]);

        off = data.nextOffset;
        done = data.done;
      }

      setLog((l) => [...l, '✅ Reseed complete']);
    } catch (e: any) {
      setLog((l) => [...l, `❌ Error: ${e.message}`]);
    } finally {
      setRunning(false);
    }
  }

  const pct = total ? Math.min(100, Math.floor((offset / total) * 100)) : 0;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {/* Quick one-shot reseed (legacy) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h2 className="font-medium">Airport Database — Quick Reseed</h2>
        <div className="flex gap-2">
          <button onClick={() => callReseed(false)} className="px-4 py-2 mr-2 rounded-xl bg-slate-700 hover:bg-slate-600">
            Reseed (upsert)
          </button>
          <button onClick={() => callReseed(true)} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500">
            Reset & Reseed
          </button>
        </div>
        {msg && <div className="text-sm text-slate-300">{msg}</div>}
        <p className="text-xs text-slate-400">
          Note: On Vercel, this may hit runtime timeouts for large datasets. Prefer the chunked reseed below.
        </p>
      </div>

      {/* Chunked reseed (Vercel-friendly) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
        <h2 className="font-medium">Airport Database — Chunked Reseed</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex items-center gap-2">
            <span className="w-28">Chunk size</span>
            <input
              type="number"
              min={50}
              max={2000}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value || '500', 10))}
              className="w-28 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-28">Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
            >
              <option value="upsert">Upsert (non-destructive)</option>
              <option value="replace">Replace (reset and truncate then insert)</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sendAuth} onChange={(e) => setSendAuth(e.target.checked)} />
            <span>Send Basic Auth header</span>
          </label>

          {sendAuth && (
            <>
              <input
                placeholder="ADMIN_USER"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
              />
              <input
                placeholder="ADMIN_PASS"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runChunkedReseed}
            disabled={running}
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Reseed All (chunked)'}
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-400">Progress</div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-3 bg-emerald-600" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-400">
            {offset} / {total} ({pct}%)
          </div>
        </div>

        <div className="text-xs max-h-64 overflow-auto bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono whitespace-pre-wrap">
          <div className="text-sm text-slate-400">Log</div>
          {log.join('\n')}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
        <h2 className="font-medium">Manage Airports</h2>
        <div className="mb-2 flex gap-4">
          <a href="/admin/airports" className="mr-2 underline hover:no-underline text-blue-400">
            Airports List
          </a>
          <a href="/admin/airport-edit" className="underline hover:no-underline text-blue-400">
            Airport Edit
          </a>
        </div>
        <div className="text-sm text-slate-400">
          Tip: Use the Airports list to search, then click an IATA to edit details.
        </div>
      </div>
    </div>
  );
}
