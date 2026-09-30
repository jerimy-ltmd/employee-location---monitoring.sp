import React, { useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../ui/Button';
import { BellRing, CheckCircle2, AlertOctagon } from 'lucide-react';

export const UrgentPingModal: React.FC = () => {
  const { urgentPing, clearUrgentPing, socket } = useSocket();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!urgentPing) return null;

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      if (socket) {
        socket.emit('ping:acknowledge', { pingId: urgentPing.id });
      }

      await fetch(`/api/pings/${urgentPing.id}/ack`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
      });

      clearUrgentPing();
    } catch (err) {
      console.error('Failed to acknowledge ping:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border-2 border-red-500 bg-card p-6 shadow-2xl text-center">
        {/* Pulsing Alert Icon */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400">
          <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          <BellRing className="h-10 w-10 animate-bounce" />
        </div>

        <div className="mt-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-xs">
            <AlertOctagon className="h-3.5 w-3.5" />
            High Priority Alert
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
            URGENT PING
          </h2>
          <p className="mt-2 text-sm font-medium text-foreground">
            {urgentPing.sender_name || 'Administrator'} is trying to get your attention immediately.
          </p>
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-950 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            "{urgentPing.message || 'Immediate response requested. Please acknowledge this ping.'}"
          </div>
        </div>

        <div className="mt-6">
          <Button
            variant="destructive"
            size="lg"
            disabled={isSubmitting}
            onClick={handleAcknowledge}
            className="w-full text-base font-bold shadow-lg hover:shadow-red-500/25 h-12 uppercase tracking-wider"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {isSubmitting ? 'Recording...' : 'ACKNOWLEDGE NOW'}
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Your acknowledgement timestamp will be transmitted to administration.
          </p>
        </div>
      </div>
    </div>
  );
};
