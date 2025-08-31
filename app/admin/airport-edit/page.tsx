'use client';

import { useState, use, useEffect } from 'react';

type tParams = Promise<{ iata: string }>;

export default function AirportEditPage({ params }: { params: tParams }) {
  const { iata }: { iata?: string } = use(params);
  const iataValue = (iata ? iata : '').toUpperCase();
  const [iataState, setIata] = useState(iataValue);
  const [airport, setAirport] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  async function fetchAirport() {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/airports/${iataState.toUpperCase()}`);
      if (!res.ok) throw new Error('Not found');
      let data;
      try {
        data = await res.json();
      } catch (e: any) {
        throw new Error('Failed to parse response');
      }
      setAirport(data);
    } catch (e: any) {
      setError(e?.message || String(e));
      setAirport(null);
    }
  }

  async function saveAirport() {
    if (!airport) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/airports/${iataState.toUpperCase()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: airport.name,
          city: airport.city,
          country: airport.country,
          timezone: airport.timezone,
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      let data;
      try {
        data = await res.json();
      } catch (e: any) {
        throw new Error('Failed to parse response');
      }
      setAirport(data);
      setSuccess('Saved successfully.');
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    setIata(iataValue);
  }, [iataValue]);

  useEffect(() => {
    if (iata) fetchAirport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iata]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Airport Override Editor</h1>
      <div className="mb-2 text-xs dark:text-slate-400">Debug: iata param = "{String(iata)}"</div>

      <div className="flex gap-2 mb-4">
        <input value={iataState} onChange={(e) => setIata(e.target.value)} placeholder="Enter IATA code" className="px-3 py-2 rounded-xl dark:dark:bg-slate-800 border border-slate-700"/>
        <button onClick={fetchAirport} className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-400 dark:bg-slate-700 hover:bg-slate-600">Fetch</button>
      </div>

      {error && <div className="text-red-400 mb-2">{error}</div>}
      {success && <div className="text-green-400 mb-2">{success}</div>}

      {airport && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm">Name</label>
            <input value={airport.name || ''} onChange={(e) => setAirport({...airport, name: e.target.value})}
              className="w-full px-3 py-2 rounded-xl dark:bg-slate-800 border border-slate-700"/>
          </div>
          <div>
            <label className="block text-sm">City</label>
            <input value={airport.city || ''} onChange={(e) => setAirport({...airport, city: e.target.value})}
              className="w-full px-3 py-2 rounded-xl dark:bg-slate-800 border border-slate-700"/>
          </div>
          <div>
            <label className="block text-sm">Country</label>
            <input value={airport.country || ''} onChange={(e) => setAirport({...airport, country: e.target.value})}
              className="w-full px-3 py-2 rounded-xl dark:bg-slate-800 border border-slate-700"/>
          </div>
          <div>
            <label className="block text-sm">Timezone</label>
            <input value={airport.timezone || ''} onChange={(e) => setAirport({...airport, timezone: e.target.value})}
              className="w-full px-3 py-2 rounded-xl dark:bg-slate-800 border border-slate-700"/>
          </div>
          <button onClick={saveAirport} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500">Save</button>
        </div>
      )}
    </div>
  );
}
