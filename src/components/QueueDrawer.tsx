import React, { useState } from 'react';
import { X, Search, Trash2, Clock, User, ChevronRight, Siren, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ClinicalIntakeRecord, TriageLevel } from '../types';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: ClinicalIntakeRecord[];
  activeRecordId?: string;
  onSelectPatient: (record: ClinicalIntakeRecord) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  activeRecordId,
  onSelectPatient,
  onClearQueue,
}) => {
  const [search, setSearch] = useState('');
  const [filterTriage, setFilterTriage] = useState<'ALL' | TriageLevel>('ALL');

  if (!isOpen) return null;

  const filteredQueue = queue.filter((item) => {
    const matchesSearch =
      item.patientMeta.nameOrId.toLowerCase().includes(search.toLowerCase()) ||
      item.chiefComplaint.complaint.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());

    const matchesTriage = filterTriage === 'ALL' || item.patientMeta.triageLevel === filterTriage;

    return matchesSearch && matchesTriage;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>OPD Patient Triage Queue</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 font-mono">
                  {queue.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Session intake history and triage records
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filters */}
          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, complaint, ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setFilterTriage('ALL')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  filterTriage === 'ALL'
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({queue.length})
              </button>
              <button
                onClick={() => setFilterTriage('EMERGENCY_RED')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  filterTriage === 'EMERGENCY_RED'
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                    : 'text-slate-400 hover:text-rose-300'
                }`}
              >
                Red ({queue.filter((q) => q.patientMeta.triageLevel === 'EMERGENCY_RED').length})
              </button>
              <button
                onClick={() => setFilterTriage('URGENT_AMBER')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  filterTriage === 'URGENT_AMBER'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                Amber ({queue.filter((q) => q.patientMeta.triageLevel === 'URGENT_AMBER').length})
              </button>
              <button
                onClick={() => setFilterTriage('ROUTINE_GREEN')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  filterTriage === 'ROUTINE_GREEN'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                Green ({queue.filter((q) => q.patientMeta.triageLevel === 'ROUTINE_GREEN').length})
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                {queue.length === 0
                  ? 'No patient intakes recorded in this session yet.'
                  : 'No patients match your search filter.'}
              </div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = item.id === activeRecordId;
                const isRed = item.patientMeta.triageLevel === 'EMERGENCY_RED';
                const isAmber = item.patientMeta.triageLevel === 'URGENT_AMBER';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectPatient(item);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-teal-500/60 ring-1 ring-teal-500/40'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        {isRed ? (
                          <Siren className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                        ) : isAmber ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className="font-bold text-xs text-slate-200">
                          {item.patientMeta.nameOrId}
                        </span>
                      </div>

                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          isRed
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isAmber
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.patientMeta.triageLevel.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium line-clamp-1">
                      {item.chiefComplaint.complaint}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-900">
                      <span>{item.id}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          {queue.length > 0 && (
            <div className="p-3 border-t border-slate-800 flex justify-between items-center bg-slate-950/40">
              <span className="text-[11px] text-slate-500">
                {queue.length} Total Patients
              </span>
              <button
                onClick={onClearQueue}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Queue</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
