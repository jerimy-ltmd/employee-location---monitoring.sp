import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Building2, MapPin, Shield, CheckCircle2, ChevronRight, ChevronLeft, Bell } from 'lucide-react';

interface SetupWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState('Provincial Government of Cagayan');
  const [buildingName, setBuildingName] = useState('Sangguniang Panlalawigan - Provincial Capitol');
  const [latitude, setLatitude] = useState('17.6132');
  const [longitude, setLongitude] = useState('121.7270');
  const [radiusMeters, setRadiusMeters] = useState('100');
  const [accuracyThreshold, setAccuracyThreshold] = useState('40');
  const [retentionDays, setRetentionDays] = useState('90');

  const totalSteps = 7;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await fetch('/api/setup-wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({
          orgName,
          buildingName,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radiusMeters: parseFloat(radiusMeters),
          accuracyThreshold: parseFloat(accuracyThreshold),
          retentionDays: parseInt(retentionDays, 10),
        }),
      });
      onOpenChange(false);
      onComplete?.();
    } catch (err) {
      console.error('Setup wizard error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-xl">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-500" />
            <DialogTitle>System Setup Wizard</DialogTitle>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Step {step} of {totalSteps}
          </span>
        </div>
        <DialogDescription>
          Configure organization parameters, building geofence perimeter, and tracking thresholds.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 border border-border">
              <h4 className="text-sm font-bold text-foreground">Step 1: Organization Identification</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the official government agency or enterprise name displayed on badges and reports.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organization / Entity Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Provincial Capitol / City Hall"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 border border-border">
              <h4 className="text-sm font-bold text-foreground">Step 2: Building Location Coordinates</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Specify the primary facility centroid coordinates (Latitude and Longitude in decimal degrees).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Facility Name</Label>
              <Input
                id="b-name"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 border border-border">
              <h4 className="text-sm font-bold text-foreground">Step 3: Geofence Radius</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Set circular perimeter around the building. Employees within this boundary are tagged 🟢 INSIDE.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rad">Perimeter Radius (Meters)</Label>
              <Input
                id="rad"
                type="number"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Standard provincial capitol compound: 80 - 150 meters.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 border border-border">
              <h4 className="text-sm font-bold text-foreground">Step 4: Location Accuracy Filter</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Readings with GPS accuracy error above this threshold are marked 🟡 LOCATION UNCERTAIN to prevent false transitions.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc">Accuracy Threshold (Meters)</Label>
              <Input
                id="acc"
                type="number"
                value={accuracyThreshold}
                onChange={(e) => setAccuracyThreshold(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Recommended: 35 - 50 meters.</p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 border border-border">
              <h4 className="text-sm font-bold text-foreground">Step 5: Employee Accounts Verification</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Sample accounts are seeded and ready for immediate testing.
              </p>
            </div>
            <div className="space-y-2 text-xs bg-muted/60 p-3 rounded-lg border border-border">
              <p className="font-semibold text-foreground">Pre-configured Testing Accounts:</p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>&bull; admin@example.com (Admin)</div>
                <div>&bull; juan@example.com (Staff)</div>
                <div>&bull; maria@example.com (Staff)</div>
                <div>&bull; pedro@example.com (Staff)</div>
                <div>&bull; ana@example.com (Staff)</div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 border border-border">
              <h4 className="text-sm font-bold text-foreground">Step 6: Retention &amp; Notifications</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Configure data privacy retention limits and notification dispatch policies.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ret">Data Retention Window</Label>
              <select
                id="ret"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days (Recommended)</option>
                <option value="180">180 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-bold text-foreground">Setup Ready to Deploy</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your government employee monitoring and communication hub has been configured according to enterprise specifications.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}
        {step < totalSteps ? (
          <Button variant="gold" onClick={handleNext}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="default" onClick={handleFinish} disabled={isSubmitting}>
            {isSubmitting ? 'Saving Configuration...' : 'Finish & Launch'}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
};
