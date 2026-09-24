import React from 'react';
import {
  MapPin,
  Clock,
  Flame,
  ArrowUpRight,
  Link2,
  Calendar,
  SlidersHorizontal,
  Gauge,
  FileCheck2,
  CheckCircle,
} from 'lucide-react';
import { SocratesHPI } from '../types';

interface SocratesCardProps {
  socrates: SocratesHPI;
  chiefComplaint: {
    complaint: string;
    duration: string;
    urgencyTier: 'Critical' | 'Urgent' | 'Standard';
  };
}

export const SocratesCard: React.FC<SocratesCardProps> = ({ socrates, chiefComplaint }) => {
  const items = [
    {
      letter: 'S',
      title: 'Site',
      subtitle: 'Anatomical Location',
      value: socrates.site,
      icon: MapPin,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    },
    {
      letter: 'O',
      title: 'Onset',
      subtitle: 'Nature & Speed',
      value: socrates.onset,
      icon: Clock,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    },
    {
      letter: 'C',
      title: 'Character',
      subtitle: 'Sensation Quality',
      value: socrates.character,
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      letter: 'R',
      title: 'Radiation',
      subtitle: 'Anatomical Spread',
      value: socrates.radiation,
      icon: ArrowUpRight,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      letter: 'A',
      title: 'Associations',
      subtitle: 'Concomitant Signs',
      value: socrates.associations?.length ? socrates.associations.join(', ') : 'None reported',
      icon: Link2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      letter: 'T',
      title: 'Time Course',
      subtitle: 'Pattern & Progression',
      value: socrates.timeCourse,
      icon: Calendar,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      letter: 'E',
      title: 'Exacerbating / Relieving',
      subtitle: 'Triggers & Alleviators',
      value: socrates.exacerbatingRelievingFactors,
      icon: SlidersHorizontal,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      letter: 'S',
      title: 'Severity',
      subtitle: 'Pain / Distress Scale',
      value: socrates.severity,
      icon: Gauge,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Header: Chief Complaint */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
            Primary Presenting Complaint
          </span>
          <h3 className="text-lg font-bold text-slate-100 mt-0.5">
            {chiefComplaint.complaint}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <span className="text-slate-400">Duration: </span>
            <span className="font-semibold text-slate-200">{chiefComplaint.duration}</span>
          </div>

          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold uppercase ${
              chiefComplaint.urgencyTier === 'Critical'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : chiefComplaint.urgencyTier === 'Urgent'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
            }`}
          >
            {chiefComplaint.urgencyTier}
          </span>
        </div>
      </div>

      {/* Synthesized Professional Clinical Narrative */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/90">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Doctor-Facing Synthesized HPI Narrative
            </h4>
          </div>
          <span className="text-[10px] text-teal-400/90 font-medium">Standard Medical Terminology</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
          {socrates.summaryNarrative}
        </p>
      </div>

      {/* SOCRATES 8-Grid Visualization */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>SOCRATES Clinical Breakdown</span>
            <span className="text-[10px] text-slate-500 font-normal">(8 Core Dimensions)</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold border ${item.color}`}
                    >
                      {item.letter}
                    </span>
                    <Icon className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="mb-1">
                    <span className="text-xs font-bold text-slate-200">{item.title}</span>
                    <span className="block text-[10px] text-slate-400">{item.subtitle}</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-900">
                  <p className="text-xs text-slate-300 font-medium line-clamp-3">
                    {item.value || <span className="text-slate-500 italic">Not elicited</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
