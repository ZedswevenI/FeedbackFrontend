import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminMetadata } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/hooks/use-auth";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

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
    subjectStaffMappings: [] as Array<{ subjectId: number; staffIds: number[] }>,
    templateId: 0,
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (schedule && open) {
      // Backend returns single schedule with subjectId and staffId
      const mappings = [];
      if (schedule.subjectId) {
        mappings.push({
          subjectId: Number(schedule.subjectId),
          staffIds: schedule.staffId ? [Number(schedule.staffId)] : []
        });
      }
      
      setFormData({
        batch: schedule.batch || "",
        phase: String(schedule.phase) || "",
        subjectStaffMappings: mappings,
        templateId: schedule.templateId ? Number(schedule.templateId) : 0,
        startDate: schedule.startDate || "",
        endDate: schedule.endDate || "",
      });
    }
  }, [schedule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.subjectStaffMappings.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one subject-staff mapping",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const token = getToken();
      
      // Send update for each subject-staff mapping
      for (const mapping of formData.subjectStaffMappings) {
        if (!mapping.subjectId || mapping.staffIds.length === 0) continue;
        
        const response = await fetch(`/api/feedback/admin/schedules/${schedule.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            batch: formData.batch,
            phase: formData.phase,
            subjectId: mapping.subjectId,
            staffIds: mapping.staffIds,
            templateId: formData.templateId,
            startDate: formData.startDate,
            endDate: formData.endDate,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update schedule");
        }
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

  const addSubjectStaffMapping = () => {
    setFormData({
      ...formData,
      subjectStaffMappings: [...formData.subjectStaffMappings, { subjectId: 0, staffIds: [] }]
    });
  };

  const removeSubjectStaffMapping = (index: number) => {
    setFormData({
      ...formData,
      subjectStaffMappings: formData.subjectStaffMappings.filter((_, i) => i !== index)
    });
  };

  const updateSubjectStaffMapping = (index: number, field: 'subjectId' | 'staffIds', value: any) => {
    const updated = [...formData.subjectStaffMappings];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, subjectStaffMappings: updated });
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
              <div className="flex items-center justify-between mb-2">
                <Label>Subject-Staff Allocation</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSubjectStaffMapping}>
                  <Plus className="h-4 w-4 mr-1" /> Add Subject
                </Button>
              </div>
              
              {formData.subjectStaffMappings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">No subjects added.</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {formData.subjectStaffMappings.map((mapping, index) => (
                    <Card key={index} className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-3">
                          <div>
                            <Label className="text-xs mb-1">Subject</Label>
                            <Select
                              value={mapping.subjectId ? String(mapping.subjectId) : ""}
                              onValueChange={(val) => updateSubjectStaffMapping(index, 'subjectId', Number(val))}
                            >
                              <SelectTrigger className="h-9">
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
                          <div>
                            <Label className="text-xs mb-1">Staff Members</Label>
                            <MultiSelect
                              options={metadata?.staff?.map((s: any) => ({ id: s.id, label: s.name })) || []}
                              selected={mapping.staffIds}
                              onChange={(staffIds) => updateSubjectStaffMapping(index, 'staffIds', staffIds)}
                              placeholder="Select staff..."
                              className="h-9"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubjectStaffMapping(index)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
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
