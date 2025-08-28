'use client';

import { useState } from 'react';

export default function AdminHome() {
  const [msg, setMsg] = useState<string>('');

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

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h2 className="font-medium">Airport Database</h2>
        <div className="flex gap-2">
          <button onClick={() => callReseed(false)} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600">Reseed (upsert)</button>
          <button onClick={() => callReseed(true)} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500">Reset & Reseed</button>
        </div>
        {msg && <div className="text-sm text-slate-300">{msg}</div>}
      </div>

      <div className="mt-6 text-sm text-slate-400">
        Tip: Use the Airports list to search, then click an IATA to edit details.
      </div>
    </div>
  );
}
