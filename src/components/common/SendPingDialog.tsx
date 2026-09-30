import React, { useState } from 'react';
import { User } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { BellRing } from 'lucide-react';

interface SendPingDialogProps {
  employee: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SendPingDialog: React.FC<SendPingDialogProps> = ({
  employee,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { socket } = useSocket();
  const [message, setMessage] = useState('Urgent ping: Please confirm your current location and report in.');
  const [isSending, setIsSending] = useState(false);

  if (!employee) return null;

  const handleSend = async () => {
    setIsSending(true);
    try {
      if (socket) {
        socket.emit('ping:send', {
          recipientId: employee.id,
          message: message.trim(),
        });
      }

      await fetch('/api/pings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({
          recipientId: employee.id,
          message: message.trim(),
        }),
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to send ping:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <BellRing className="h-5 w-5" />
          <DialogTitle>Send Urgent Ping</DialogTitle>
        </div>
        <DialogDescription>
          This will trigger an audible alert and high-priority in-app modal notification on the employee's screen until acknowledged.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Recipient</p>
          <p className="text-sm font-bold text-foreground mt-0.5">{employee.name}</p>
          <p className="text-xs text-muted-foreground">{employee.position} &bull; {employee.department}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ping-msg">Alert Message</Label>
          <Input
            id="ping-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter reason for urgent ping..."
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleSend} disabled={isSending}>
          <BellRing className="mr-1.5 h-4 w-4" />
          {isSending ? 'Sending Ping...' : 'Send Urgent Ping'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
