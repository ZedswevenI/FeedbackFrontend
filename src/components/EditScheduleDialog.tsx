import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminMetadata } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/hooks/use-auth";

interface EditScheduleDialogProps {
  schedule: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditScheduleDialog({ schedule, open, onOpenChange, onSuccess }: EditScheduleDialogProps) {
  const { data: metadata } = useAdminMetadata();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    batch: "",
    phase: "",
    subjectId: 0,
    staffId: 0,
    templateId: 0,
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (schedule && open) {
      setFormData({
        batch: schedule.batch || "",
        phase: String(schedule.phase) || "",
        subjectId: schedule.subjectId ? Number(schedule.subjectId) : 0,
        staffId: schedule.staffId ? Number(schedule.staffId) : 0,
        templateId: schedule.templateId ? Number(schedule.templateId) : 0,
        startDate: schedule.startDate || "",
        endDate: schedule.endDate || "",
      });
    }
  }, [schedule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subjectId || !formData.staffId) {
      toast({
        title: "Error",
        description: "Please select both subject and staff",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const token = getToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      
      const response = await fetch(`${baseUrl}/api/feedback/admin/schedules/${schedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          batch: formData.batch,
          phase: formData.phase,
          subjectId: formData.subjectId,
          staffId: formData.staffId,
          templateId: formData.templateId,
          startDate: formData.startDate,
          endDate: formData.endDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update schedule");
      }
      
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
          <DialogDescription>Update the feedback schedule details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="batch">Batch</Label>
              <Select value={formData.batch} onValueChange={(value) => setFormData({ ...formData, batch: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {metadata?.batches.map((batch: string) => (
                    <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phase">Phase</Label>
              <Select value={formData.phase} onValueChange={(value) => setFormData({ ...formData, phase: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,'R'].map(p => (
                    <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={formData.subjectId ? String(formData.subjectId) : ""}
                onValueChange={(val) => setFormData({ ...formData, subjectId: Number(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {metadata?.subjects?.map((subject: any) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Select
                value={formData.staffId ? String(formData.staffId) : ""}
                onValueChange={(val) => setFormData({ ...formData, staffId: Number(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {metadata?.staff?.map((staff: any) => (
                    <SelectItem key={staff.id} value={String(staff.id)}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template">Template</Label>
              <Select value={formData.templateId && formData.templateId > 0 ? String(formData.templateId) : ""} onValueChange={(value) => setFormData({ ...formData, templateId: Number(value) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {metadata?.templates?.map((template: any) => (
                    <SelectItem key={template.id} value={String(template.id)}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
