'use client';

import { useEffect, useMemo, useState } from 'react';
import { DateTime, Duration } from 'luxon';
import { motion } from 'framer-motion';

type Leg = {
  id: string;
  origin: string; // IATA
  destination: string; // IATA
  departDate: string; // YYYY-MM-DD
  departTime: string; // HH:mm
  arriveDate: string; // YYYY-MM-DD
  arriveTime: string; // HH:mm
  originTz?: string; // resolved
  destinationTz?: string; // resolved
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

async function fetchTimezone(iata: string): Promise<string | undefined> {
  if (!iata || iata.length !== 3) return;
  try {
    const r = await fetch(`/api/timezone?iata=${encodeURIComponent(iata.toUpperCase())}`);
    if (!r.ok) return;
    const data = await r.json();
    return data.timezone as string | undefined;
  } catch {
    return;
  }
}

function parseLocalToUTC(dateISO: string, timeHM: string, tz: string) {
  const [h, m] = timeHM.split(':').map(Number);
  const dt = DateTime.fromISO(dateISO, { zone: tz }).set({ hour: h || 0, minute: m || 0, second: 0, millisecond: 0 });
  return dt.toUTC();
}

function formatHM(duration: Duration) {
  const totalMinutes = Math.round(duration.as('minutes'));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.abs(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
}

export default function Page() {
  const today = DateTime.now().toISODate() || '';

  const [legs, setLegs] = useState<Leg[]>([{
    id: uid(),
    origin: 'SIN',
    destination: 'SEA',
    departDate: today,
    departTime: '09:00',
    arriveDate: today,
    arriveTime: '07:10',
  }]);

  // Resolve timezones whenever IATA changes
  useEffect(() => {
    (async () => {
      await Promise.all(legs.map(async (leg) => {
        if (leg.origin && !leg.originTz) {
          const tz = await fetchTimezone(leg.origin);
          if (tz) setLegs((prev) => prev.map((l) => l.id === leg.id ? { ...l, originTz: tz } : l));
        }
        if (leg.destination && !leg.destinationTz) {
          const tz = await fetchTimezone(leg.destination);
          if (tz) setLegs((prev) => prev.map((l) => l.id === leg.id ? { ...l, destinationTz: tz } : l));
        }
      }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs.map(l => l.origin).join(','), legs.map(l => l.destination).join(',')]);

  const results = useMemo(() => {
    const legSummaries: {
      id: string;
      origin: string;
      destination: string;
      originTz: string;
      destinationTz: string;
      departLocal: string;
      arriveLocal: string;
      departUTC: DateTime;
      arriveUTC: DateTime;
      duration: Duration;
    }[] = [];

    const errors: string[] = [];

    for (const leg of legs) {
      const originTz = leg.originTz || 'UTC';
      const destTz = leg.destinationTz || 'UTC';
      try {
        const departUTC = parseLocalToUTC(leg.departDate, leg.departTime, originTz);
        const arriveUTC = parseLocalToUTC(leg.arriveDate, leg.arriveTime, destTz);

        if (!departUTC.isValid) throw new Error(`Invalid departure date/time for ${leg.origin}`);
        if (!arriveUTC.isValid) throw new Error(`Invalid arrival date/time for ${leg.destination}`);

        const duration = arriveUTC.diff(departUTC, ['hours', 'minutes', 'seconds']);
        legSummaries.push({
          id: leg.id,
          origin: leg.origin.toUpperCase(),
          destination: leg.destination.toUpperCase(),
          originTz,
          destinationTz: destTz,
          departLocal: DateTime.fromISO(`${leg.departDate}T${leg.departTime}`, { zone: originTz }).toFormat('ccc, dd LLL yyyy • HH:mm ZZZZ'),
          arriveLocal: DateTime.fromISO(`${leg.arriveDate}T${leg.arriveTime}`, { zone: destTz }).toFormat('ccc, dd LLL yyyy • HH:mm ZZZZ'),
          departUTC,
          arriveUTC,
          duration,
        });
      } catch (e: any) {
        errors.push(e.message || String(e));
      }
    }

    const transits: Duration[] = [];
    for (let i = 0; i < legSummaries.length - 1; i++) {
      const gap = legSummaries[i + 1].departUTC.diff(legSummaries[i].arriveUTC, ['hours', 'minutes']);
      transits.push(gap);
    }

    const totalFlight = legSummaries.reduce((acc, l) => acc.plus(l.duration), Duration.fromObject({ minutes: 0 }));
    const totalTransit = transits.reduce((acc, d) => acc.plus(d), Duration.fromObject({ minutes: 0 }));
    const totalJourney = totalFlight.plus(totalTransit);

    return { legSummaries, transits, totalFlight, totalTransit, totalJourney, errors };
  }, [legs]);

  const addLegAfter = (index?: number) => {
    const now = DateTime.now();
    const newLeg: Leg = {
      id: uid(),
      origin: '',
      destination: '',
      departDate: now.toISODate() || '',
      departTime: '00:00',
      arriveDate: now.toISODate() || '',
      arriveTime: '00:00',
    };
    setLegs((prev) => {
      const arr = [...prev];
      if (index === undefined || index === prev.length - 1) arr.push(newLeg);
      else arr.splice(index + 1, 0, newLeg);
      return arr;
    });
  };

  const removeLeg = (id: string) => setLegs((prev) => prev.filter((l) => l.id !== id));
  const updateLeg = (id: string, patch: Partial<Leg>) => setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const autoChainDates = (index: number) => {
    if (index < 0 || index >= legs.length - 1) return;
    const curr = legs[index];
    const arrTz = curr.destinationTz || 'UTC';
    const arriveLocal = DateTime.fromISO(`${curr.arriveDate}T${curr.arriveTime}`, { zone: arrTz });
    const nextDefault = arriveLocal.plus({ hours: 2 });
    const next = legs[index + 1];
    updateLeg(next.id, { departDate: nextDefault.toISODate() || next.departDate, departTime: nextDefault.toFormat('HH:mm') });
  };

  return (
    <div className="max-w-7xl mx-auto p-10">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-bold mb-2">
        Flight Time Calculator
      </motion.h1>
      <p className="text-slate-300 mb-6">
        Enter each flight leg with IATA codes, dates, and local times. Time zones & DST are handled via IANA zones from the airport database.
      </p>

      <div className="space-y-4">
        {legs.map((leg, idx) => {
          const summary = results.legSummaries.find((l) => l.id === leg.id);
          return (
            <div key={leg.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex flex-wrap justify-evenly items-end gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">From (IATA)</label>
                  <input className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2"
                    placeholder="SIN"
                    value={leg.origin}
                    onChange={(e) => updateLeg(leg.id, { origin: e.target.value.toUpperCase(), originTz: undefined })} />
                  {leg.originTz && <p className="text-xs text-slate-400 mt-1">TZ: {leg.originTz}</p>}
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm mb-1">Depart (local)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2"
                      value={leg.departDate}
                      onChange={(e) => updateLeg(leg.id, { departDate: e.target.value })} />
                    <input type="time" className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2"
                      value={leg.departTime}
                      onChange={(e) => updateLeg(leg.id, { departTime: e.target.value })} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">To (IATA)</label>
                  <input className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2"
                    placeholder="SEA"
                    value={leg.destination}
                    onChange={(e) => updateLeg(leg.id, { destination: e.target.value.toUpperCase(), destinationTz: undefined })} />
                  {leg.destinationTz && <p className="text-xs text-slate-400 mt-1">TZ: {leg.destinationTz}</p>}
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm mb-1">Arrive (local)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2"
                      value={leg.arriveDate}
                      onChange={(e) => updateLeg(leg.id, { arriveDate: e.target.value })} />
                    <input type="time" className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2"
                      value={leg.arriveTime}
                      onChange={(e) => updateLeg(leg.id, { arriveTime: e.target.value })} />
                  </div>
                </div>

                {summary && (
                  <div className="md:col-span-12 mt-2 text-sm text-slate-200">
                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="bg-slate-950/50 rounded-xl p-3">
                        <div className="text-slate-400">Departure</div>
                        <div className="font-medium">{summary.origin} • {summary.departLocal}</div>
                      </div>
                      <div className="bg-slate-950/50 rounded-xl p-3">
                        <div className="text-slate-400">Arrival</div>
                        <div className="font-medium">{summary.destination} • {summary.arriveLocal}</div>
                      </div>
                      <div className="bg-slate-950/50 rounded-xl p-3">
                        <div className="text-slate-400">Flight time</div>
                        <div className="font-semibold">{formatHM(summary.duration)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {idx < legs.length - 1 && (
                  <div className="md:col-span-12 flex items-center gap-2 text-slate-300">
                    <button onClick={() => autoChainDates(idx)} className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800">
                      Set next leg depart ≈ +2h after this arrival
                    </button>
                    {summary && (<span className="text-xs opacity-80">Arrives: {summary.arriveLocal}</span>)}
                  </div>
                )}

                <div className="flex gap-2 ml-auto">
                  <button onClick={() => addLegAfter(idx)} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600">Add Leg</button>
                  {legs.length > 1 && (
                    <button onClick={() => removeLeg(leg.id)} className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500">Remove</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-xl font-semibold mb-3">Journey Summary</h2>
          {results.errors.length > 0 && (
            <div className="mb-3 text-rose-300 text-sm">
              {results.errors.map((e, i) => (<div key={i}>⚠️ {e}</div>))}
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-3 text-slate-100">
            <div className="bg-slate-950/50 rounded-xl p-4">
              <div className="text-slate-400">Total flight time</div>
              <div className="text-2xl font-bold">{formatHM(results.totalFlight)}</div>
            </div>
            <div className="bg-slate-950/50 rounded-xl p-4">
              <div className="text-slate-400">Total transit time</div>
              <div className="text-2xl font-bold">{formatHM(results.totalTransit)}</div>
            </div>
            <div className="bg-slate-950/50 rounded-xl p-4">
              <div className="text-slate-400">Total journey time</div>
              <div className="text-2xl font-bold">{formatHM(results.totalJourney)}</div>
            </div>
          </div>

          {results.transits.length > 0 && (
            <div className="mt-4 text-sm text-slate-300">
              <div className="font-medium mb-2">Transits between legs</div>
              <ol className="list-decimal ml-6 space-y-1">
                {results.transits.map((t, i) => (<li key={i}>Leg {i + 1} → Leg {i + 2}: {formatHM(t)}</li>))}
              </ol>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
