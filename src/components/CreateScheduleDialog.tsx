import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useAdminMetadata, useCreateSchedule } from "@/hooks/use-admin";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card } from "@/components/ui/card";

const formSchema = api.admin.schedule.input;
type FormValues = z.infer<typeof formSchema>;

export function CreateScheduleDialog() {
  const [open, setOpen] = useState(false);
  const { data: metadata, isLoading: loadingMetadata } = useAdminMetadata();
  const { mutateAsync: createSchedule, isPending } = useCreateSchedule();
  const [subjectStaffMappings, setSubjectStaffMappings] = useState<Array<{ subjectId: number; staffIds: number[] }>>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batch: "",
      phase: "1",
      subjectId: 0,
      staffIds: [],
      templateId: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (subjectStaffMappings.length === 0) {
      form.setError('root', { message: 'Please add at least one subject-staff mapping' });
      return;
    }
    
    try {
      // Send a request for each subject-staff mapping
      for (const mapping of subjectStaffMappings) {
        if (!mapping.subjectId || mapping.staffIds.length === 0) continue;
        
        await createSchedule({
          batch: data.batch,
          phase: data.phase,
          subjectId: mapping.subjectId,
          staffIds: mapping.staffIds,
          templateId: data.templateId,
          startDate: data.startDate,
          endDate: data.endDate,
        });
      }
      
      setOpen(false);
      form.reset();
      setSubjectStaffMappings([]);
    } catch (error) {
      // Handled by hook toast
    }
  };

  const addSubjectStaffMapping = () => {
    setSubjectStaffMappings([...subjectStaffMappings, { subjectId: 0, staffIds: [] }]);
  };

  const removeSubjectStaffMapping = (index: number) => {
    setSubjectStaffMappings(subjectStaffMappings.filter((_, i) => i !== index));
  };

  const updateSubjectStaffMapping = (index: number, field: 'subjectId' | 'staffIds', value: any) => {
    const updated = [...subjectStaffMappings];
    updated[index] = { ...updated[index], [field]: value };
    setSubjectStaffMappings(updated);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg hover:shadow-primary/25 transition-all">
          <Plus className="h-4 w-4" />
          Create Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">New Feedback Schedule</DialogTitle>
          <DialogDescription>
            Configure a new feedback session for a specific batch and subject.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {metadata?.batches && metadata.batches.length > 0 ? (
                          metadata.batches.map((batch: string) => (
                            <SelectItem key={batch} value={batch}>
                              {batch}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-batches" disabled>No batches available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10,'R'].map(p => (
                          <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Subject-Staff Allocation</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addSubjectStaffMapping}>
                  <Plus className="h-4 w-4 mr-1" /> Add Subject
                </Button>
              </div>
              
              {subjectStaffMappings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">No subjects added. Click "Add Subject" to start.</p>
              ) : (
                <div className="space-y-3">
                  {subjectStaffMappings.map((mapping, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Subject</label>
                            <Select
                              value={mapping.subjectId ? String(mapping.subjectId) : ""}
                              onValueChange={(val) => updateSubjectStaffMapping(index, 'subjectId', Number(val))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {metadata?.subjects?.map((subject: {id: number; name: string}) => (
                                  <SelectItem key={subject.id} value={String(subject.id)}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Staff Members</label>
                            <MultiSelect
                              options={metadata?.staff?.map((s: {id: number; name: string}) => ({
                                id: s.id,
                                label: s.name
                              })) || []}
                              selected={mapping.staffIds}
                              onChange={(staffIds) => updateSubjectStaffMapping(index, 'staffIds', staffIds)}
                              placeholder="Select staff members..."
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubjectStaffMapping(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(Number(val))} 
                    value={field.value ? String(field.value) : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {metadata?.templates && metadata.templates.length > 0 ? (
                        metadata.templates.map((template: {id: number; name: string}) => (
                          <SelectItem key={template.id} value={String(template.id)}>
                            {template.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-templates" disabled>No templates available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

<div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Scheduling..." : "Create Schedule"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
