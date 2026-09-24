import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  AlertTriangle,
  Siren,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  ShieldAlert,
  FileSpreadsheet,
  X,
  PieChart,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ClinicalIntakeRecord, TriageLevel } from '../types';

interface DailyThroughputDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  encounters: ClinicalIntakeRecord[];
  onSelectEncounter: (record: ClinicalIntakeRecord) => void;
  onOpenNewEncounter: () => void;
}

export const DailyThroughputDashboard: React.FC<DailyThroughputDashboardProps> = ({
  isOpen,
  onClose,
  encounters,
  onSelectEncounter,
  onOpenNewEncounter,
}) => {
  const [timeFilter, setTimeFilter] = useState<'TODAY' | 'ALL'>('TODAY');

  if (!isOpen) return null;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Filter encounters for today vs all-time
  const filteredEncounters = encounters.filter((enc) => {
    if (timeFilter === 'ALL') return true;
    const encDate = new Date(enc.timestamp).toISOString().slice(0, 10);
    return encDate === todayStr;
  });

  const totalPatients = filteredEncounters.length;

  // Triage breakdown
  const emergencyRedCount = filteredEncounters.filter(
    (e) => e.patientMeta.triageLevel === 'EMERGENCY_RED'
  ).length;
  const urgentAmberCount = filteredEncounters.filter(
    (e) => e.patientMeta.triageLevel === 'URGENT_AMBER'
  ).length;
  const routineGreenCount = filteredEncounters.filter(
    (e) => e.patientMeta.triageLevel === 'ROUTINE_GREEN'
  ).length;

  const redPct = totalPatients > 0 ? Math.round((emergencyRedCount / totalPatients) * 100) : 0;
  const amberPct = totalPatients > 0 ? Math.round((urgentAmberCount / totalPatients) * 100) : 0;
  const greenPct = totalPatients > 0 ? Math.round((routineGreenCount / totalPatients) * 100) : 0;

  // Red Flags & Drug Safety Metrics
  const totalRedFlagsIdentified = filteredEncounters.reduce(
    (acc, e) => acc + (e.redFlags?.length || 0),
    0
  );

  const encountersWithMedIssues = filteredEncounters.filter(
    (e) => (e.medicationReconciliation?.issues?.length || 0) > 0
  ).length;

  const totalIdentifiedMedInteractions = filteredEncounters.reduce(
    (acc, e) => acc + (e.medicationReconciliation?.issues?.length || 0),
    0
  );

  // Hourly distribution breakdown (00:00 - 23:00)
  const hourlyBuckets = [
    { label: 'Morning (06:00 - 11:59)', count: 0, red: 0, amber: 0, green: 0 },
    { label: 'Afternoon (12:00 - 16:59)', count: 0, red: 0, amber: 0, green: 0 },
    { label: 'Evening (17:00 - 21:59)', count: 0, red: 0, amber: 0, green: 0 },
    { label: 'Night (22:00 - 05:59)', count: 0, red: 0, amber: 0, green: 0 },
  ];

  filteredEncounters.forEach((e) => {
    const hour = new Date(e.timestamp).getHours();
    let bucketIdx = 3; // Night
    if (hour >= 6 && hour < 12) bucketIdx = 0;
    else if (hour >= 12 && hour < 17) bucketIdx = 1;
    else if (hour >= 17 && hour < 22) bucketIdx = 2;

    hourlyBuckets[bucketIdx].count += 1;
    if (e.patientMeta.triageLevel === 'EMERGENCY_RED') hourlyBuckets[bucketIdx].red += 1;
    else if (e.patientMeta.triageLevel === 'URGENT_AMBER') hourlyBuckets[bucketIdx].amber += 1;
    else hourlyBuckets[bucketIdx].green += 1;
  });

  // Recent high-priority alerts
  const criticalCases = filteredEncounters
    .filter((e) => e.patientMeta.triageLevel === 'EMERGENCY_RED' || (e.redFlags && e.redFlags.length > 0))
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-teal-500/20">
              <BarChart3 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-100">
                  Clinic Daily Throughput & Triage Analytics
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  Live OPD Metrics
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time patient census, acuity stratification, and safety gatekeeper analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Time Filter Toggle */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setTimeFilter('TODAY')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  timeFilter === 'TODAY'
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Today ({todayStr})
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  timeFilter === 'ALL'
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Time ({encounters.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="Close Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dashboard Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Census */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Patients Processed</span>
                <Users className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <span className="text-3xl font-black text-slate-100 font-mono">
                  {totalPatients}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  {timeFilter === 'TODAY' ? 'Handled during today’s clinic' : 'Processed across all sessions'}
                </p>
              </div>
            </div>

            {/* Emergency Red */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-300 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Siren className="w-3.5 h-3.5 text-rose-400" />
                  Emergency Red
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  {redPct}%
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-rose-300 font-mono">
                  {emergencyRedCount}
                </span>
                <p className="text-[11px] text-rose-400/80 mt-1">
                  Immediate stat physician attention required
                </p>
              </div>
            </div>

            {/* Urgent Amber */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-300 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Urgent Amber
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {amberPct}%
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-amber-300 font-mono">
                  {urgentAmberCount}
                </span>
                <p className="text-[11px] text-amber-400/80 mt-1">
                  Target physician review within 30 mins
                </p>
              </div>
            </div>

            {/* Routine Green */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-300 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Routine Green
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {greenPct}%
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-emerald-300 font-mono">
                  {routineGreenCount}
                </span>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  Standard OPD queuing workflow
                </p>
              </div>
            </div>
          </div>

          {/* Acuity Breakdown Visual Progress Stack */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-teal-400" />
                Acuity Stratification & Caseload Distribution
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {totalPatients} Encounters Total
              </span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              {emergencyRedCount > 0 && (
                <div
                  style={{ width: `${(emergencyRedCount / (totalPatients || 1)) * 100}%` }}
                  className="bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-500"
                  title={`Emergency Red: ${emergencyRedCount} (${redPct}%)`}
                />
              )}
              {urgentAmberCount > 0 && (
                <div
                  style={{ width: `${(urgentAmberCount / (totalPatients || 1)) * 100}%` }}
                  className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                  title={`Urgent Amber: ${urgentAmberCount} (${amberPct}%)`}
                />
              )}
              {routineGreenCount > 0 && (
                <div
                  style={{ width: `${(routineGreenCount / (totalPatients || 1)) * 100}%` }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  title={`Routine Green: ${routineGreenCount} (${greenPct}%)`}
                />
              )}
            </div>

            {/* Legend with counts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Emergency (Red)</span>
                  <span className="font-mono font-bold text-rose-300">
                    {emergencyRedCount} ({redPct}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Urgent (Amber)</span>
                  <span className="font-mono font-bold text-amber-300">
                    {urgentAmberCount} ({amberPct}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Routine (Green)</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {routineGreenCount} ({greenPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shift Time Distribution & Clinical Safety Gatekeeper */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Shift Time Distribution */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Clinic Shift Throughput
                </h3>
                <span className="text-xs text-slate-500">By arrival window</span>
              </div>

              <div className="space-y-3">
                {hourlyBuckets.map((bucket, idx) => {
                  const bucketPct = totalPatients > 0 ? Math.round((bucket.count / totalPatients) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{bucket.label}</span>
                        <span className="font-mono text-slate-400">
                          <strong className="text-slate-200">{bucket.count}</strong> pts ({bucketPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${bucketPct}%` }}
                          className="bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all"
                        />
                      </div>
                      {bucket.count > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-1">
                          {bucket.red > 0 && (
                            <span className="text-rose-400 font-semibold">&bull; {bucket.red} Red</span>
                          )}
                          {bucket.amber > 0 && (
                            <span className="text-amber-400 font-semibold">&bull; {bucket.amber} Amber</span>
                          )}
                          {bucket.green > 0 && (
                            <span className="text-emerald-400 font-semibold">&bull; {bucket.green} Green</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clinical Safety Gatekeeper Metrics */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Safety & Medication Gatekeeper
                </h3>
                <span className="text-xs text-slate-500">Intervention rate</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Red Flag Alerts Detected
                  </span>
                  <span className="text-2xl font-black text-rose-400 font-mono mt-1 block">
                    {totalRedFlagsIdentified}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ACS, Stroke, Sepsis alarms
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Drug Interactions Flagged
                  </span>
                  <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                    {totalIdentifiedMedInteractions}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Across {encountersWithMedIssues} patient records
                  </span>
                </div>
              </div>

              {/* Safety summary narrative */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Clinical Quality Impact:</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  {totalPatients === 0
                    ? 'No patient encounters logged yet for this period.'
                    : `In this census, ${Math.round(
                        ((emergencyRedCount + urgentAmberCount) / (totalPatients || 1)) * 100
                      )}% of cases were elevated to high-priority triage tiers, and ${totalRedFlagsIdentified} life-threatening red-flag presentations were captured prior to physician consultation.`}
                </p>
              </div>
            </div>
          </div>

          {/* High-Priority Cases Requiring Urgent Focus */}
          {criticalCases.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Siren className="w-4 h-4 text-rose-400" />
                  High-Priority Emergency / Red Flag Cases Today
                </h3>
                <span className="text-xs text-rose-400 font-medium">Actionable Cases</span>
              </div>

              <div className="space-y-2">
                {criticalCases.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100">
                          {rec.patientMeta.nameOrId}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                            rec.patientMeta.triageLevel === 'EMERGENCY_RED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {rec.patientMeta.triageLevel.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {rec.chiefComplaint.complaint} &bull; {rec.chiefComplaint.duration}
                      </p>
                      {rec.redFlags && rec.redFlags.length > 0 && (
                        <p className="text-[11px] text-rose-400 font-medium line-clamp-1">
                          Alert: {rec.redFlags.map((r) => r.clinicalConcern).join('; ')}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectEncounter(rec);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 flex items-center gap-1 transition-all shrink-0"
                    >
                      <span>Open Case</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>OPD Census active &bull; Auto-syncing with triage logs</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenNewEncounter();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all"
            >
              + New Patient Intake
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
