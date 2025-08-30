'use client';

import { useState } from 'react';

export default function AirportEditPage() {
  const [iata, setIata] = useState('');
  const [airport, setAirport] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  async function fetchAirport() {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/airports/${iata.toUpperCase()}`);
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
      const res = await fetch(`/api/airports/${iata.toUpperCase()}`, {
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Airport Override Editor</h1>

      <div className="flex gap-2 mb-4">
        <input value={iata} onChange={(e) => setIata(e.target.value)} placeholder="Enter IATA code" className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"/>
        <button onClick={fetchAirport} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600">Fetch</button>
      </div>

      {error && <div className="text-red-400 mb-2">{error}</div>}
      {success && <div className="text-green-400 mb-2">{success}</div>}

      {airport && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm">Name</label>
            <input value={airport.name || ''} onChange={(e) => setAirport({...airport, name: e.target.value})}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"/>
          </div>
          <div>
            <label className="block text-sm">City</label>
            <input value={airport.city || ''} onChange={(e) => setAirport({...airport, city: e.target.value})}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"/>
          </div>
          <div>
            <label className="block text-sm">Country</label>
            <input value={airport.country || ''} onChange={(e) => setAirport({...airport, country: e.target.value})}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"/>
          </div>
          <div>
            <label className="block text-sm">Timezone</label>
            <input value={airport.timezone || ''} onChange={(e) => setAirport({...airport, timezone: e.target.value})}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"/>
          </div>
          <button onClick={saveAirport} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500">Save</button>
        </div>
      )}
    </div>
  );
}
