import React, { useEffect, useState, useRef } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Siren,
  Activity,
  Bell,
  BellRing,
  BellOff,
} from 'lucide-react';
import { TriageLevel, RedFlagAlert } from '../types';

interface TriageBannerProps {
  triageLevel: TriageLevel;
  triageReason: string;
  redFlags: RedFlagAlert[];
  redactedIdentifiers: string[];
  encounterId?: string;
  patientName?: string;
  chiefComplaint?: string;
}

export const TriageBanner: React.FC<TriageBannerProps> = ({
  triageLevel,
  triageReason,
  redFlags,
  redactedIdentifiers,
  encounterId,
  patientName,
  chiefComplaint,
}) => {
  const isEmergency = triageLevel === 'EMERGENCY_RED';
  const isUrgent = triageLevel === 'URGENT_AMBER';
  const isRoutine = triageLevel === 'ROUTINE_GREEN';

  // Desktop notification permission & trigger state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [notificationFired, setNotificationFired] = useState(false);
  const notifiedRecordIdsRef = useRef<Set<string>>(new Set());

  const hasCriticalAlert = isEmergency || redFlags.some((rf) => rf.severity === 'CRITICAL');

  // Trigger desktop notification when critical/emergency patient is processed
  useEffect(() => {
    if (!hasCriticalAlert) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const dedupeKey = encounterId || `${patientName || 'anonymous'}-${triageReason}`;
    if (notifiedRecordIdsRef.current.has(dedupeKey)) return;

    const sendDesktopAlert = () => {
      try {
        const topConcern = redFlags.length > 0 ? redFlags[0].clinicalConcern : triageReason;
        const title = `🚨 EMERGENCY CODE RED: ${patientName || 'Incoming Patient'}`;
        const body = `CRITICAL TRIAGE ALERT: ${chiefComplaint ? `${chiefComplaint} - ` : ''}${topConcern}. Immediate stat physician assessment required!`;

        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: dedupeKey, // Avoid duplicate popups for same encounter
          requireInteraction: true, // Keep alert visible on desktop until acknowledged
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        notifiedRecordIdsRef.current.add(dedupeKey);
        setNotificationFired(true);
      } catch (err) {
        console.warn('Browser desktop notification error:', err);
      }
    };

    if (Notification.permission === 'granted') {
      sendDesktopAlert();
    } else if (Notification.permission === 'default') {
      // Prompt for permission if user hasn't chosen yet
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          sendDesktopAlert();
        }
      });
    }
  }, [hasCriticalAlert, encounterId, patientName, chiefComplaint, triageReason, redFlags]);

  const handleManualRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Desktop notifications are not supported by this browser.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted' && hasCriticalAlert) {
        const topConcern = redFlags.length > 0 ? redFlags[0].clinicalConcern : triageReason;
        const title = `🚨 EMERGENCY CODE RED: ${patientName || 'Incoming Patient'}`;
        const body = `CRITICAL TRIAGE ALERT: ${chiefComplaint ? `${chiefComplaint} - ` : ''}${topConcern}. Immediate stat physician assessment required!`;
        new Notification(title, { body, icon: '/favicon.ico', requireInteraction: true });
        setNotificationFired(true);
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary Triage Level Banner */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          isEmergency
            ? 'bg-rose-950/40 border-rose-600/70 shadow-xl shadow-rose-950/30'
            : isUrgent
            ? 'bg-amber-950/40 border-amber-600/70 shadow-xl shadow-amber-950/30'
            : 'bg-emerald-950/40 border-emerald-600/70 shadow-xl shadow-emerald-950/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                isEmergency
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                  : isUrgent
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {isEmergency ? (
                <Siren className="w-6 h-6 animate-bounce" />
              ) : isUrgent ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isEmergency
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : isUrgent
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isEmergency
                    ? 'PRIORITY 1: EMERGENCY CODE RED'
                    : isUrgent
                    ? 'PRIORITY 2: URGENT EVALUATION (AMBER)'
                    : 'PRIORITY 3: ROUTINE OPD FLOW (GREEN)'}
                </span>

                <span className="text-xs text-slate-400">
                  Automated OPD Triage Protocol
                </span>

                {/* Desktop Notification Status Badge for Critical/Emergency Cases */}
                {hasCriticalAlert && (
                  <div className="flex items-center gap-1.5 ml-1">
                    {notificationPermission === 'granted' ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 text-[10px] font-mono flex items-center gap-1">
                        <BellRing className="w-3 h-3 text-rose-400 animate-pulse" />
                        <span>Desktop Alert Dispatched</span>
                      </span>
                    ) : notificationPermission === 'denied' ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono flex items-center gap-1">
                        <BellOff className="w-3 h-3 text-slate-500" />
                        <span>Notifications Blocked by Browser</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleManualRequestPermission}
                        className="px-2 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                        title="Enable browser notifications for critical emergencies"
                      >
                        <Bell className="w-3 h-3" />
                        <span>Enable Desktop Alerts</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm font-semibold text-slate-100 mt-1">
                {triageReason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <div className="text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Triage Status</span>
              <span
                className={`text-sm font-extrabold ${
                  isEmergency ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {isEmergency ? 'Immediate Attention' : isUrgent ? 'Prompt OPD Review' : 'Standard Queue'}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Red-Flag List */}
        {redFlags && redFlags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 mb-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Triggered Red-Flag Symptoms & Immediate Precautions ({redFlags.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-rose-900/60 rounded-xl p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        {flag.symptom}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      <span className="text-slate-400">Clinical Concern:</span> {flag.clinicalConcern}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-amber-300/90 flex items-start gap-1.5">
                    <Activity className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                    <span>
                      <strong className="font-semibold text-amber-300">Immediate Action:</strong>{' '}
                      {flag.immediateTriageAction}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Privacy & Redaction Verification Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300 font-medium">
            Privacy & Identity Redaction Active:
          </span>
          {redactedIdentifiers && redactedIdentifiers.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {redactedIdentifiers.map((item, i) => (
                <span
                  key={i}
                  className="bg-slate-800 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded text-[11px] font-mono"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-400 italic">No government ID numbers detected in narrative.</span>
          )}
        </div>

        <div className="text-[11px] text-slate-500 sm:text-right">
          Zero raw government IDs stored or echoed in doctor notes
        </div>
      </div>
    </div>
  );
};
