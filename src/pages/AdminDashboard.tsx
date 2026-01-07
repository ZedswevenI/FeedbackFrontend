import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdminMetadata, useAnalytics } from "@/hooks/use-admin";
import { useSchedules } from "@/hooks/use-schedules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, CalendarRange, FileText, Download, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { CreateScheduleDialog } from "@/components/CreateScheduleDialog";
import { EditScheduleDialog } from "@/components/EditScheduleDialog";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/hooks/use-auth";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { data: metadata } = useAdminMetadata();
  const { data: schedules, refetch: refetchSchedules } = useSchedules();
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [scheduleFilterBatch, setScheduleFilterBatch] = useState<string>("all");
  const [scheduleFilterPhase, setScheduleFilterPhase] = useState<string>("all");
  const [scheduleFilterSubject, setScheduleFilterSubject] = useState<string>("all");
  const [scheduleFilterStaff, setScheduleFilterStaff] = useState<string>("all");
  const [scheduleFromDate, setScheduleFromDate] = useState<string>("");
  const [scheduleToDate, setScheduleToDate] = useState<string>("");
  const [scheduleSearchText, setScheduleSearchText] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const itemsPerPage = 10;
  const { toast } = useToast();
  
  const { data: analytics, refetch: refetchAnalytics } = useAnalytics(Number(selectedStaffId), { 
    batchId: selectedBatchId 
  });

  const handleSearch = () => {
    if (selectedStaffId) {
      setShowAnalytics(true);
      refetchAnalytics();
    }
  };

  const handleReset = () => {
    setSelectedStaffId("");
    setSelectedBatchId("all");
    setSelectedPhase("all");
    setSelectedSubject("all");
    setFromDate("");
    setToDate("");
    setShowAnalytics(false);
  };

  const handleScheduleReset = () => {
    setScheduleFilterBatch("all");
    setScheduleFilterPhase("all");
    setScheduleFilterSubject("all");
    setScheduleFilterStaff("all");
    setScheduleFromDate("");
    setScheduleToDate("");
    setScheduleSearchText("");
    setCurrentPage(1);
  };

  const handleToggleSchedule = async (scheduleId: number, currentStatus: boolean) => {
    try {
      const token = getToken();
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/feedback/admin/schedules/${scheduleId}/toggle`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Schedule ${currentStatus ? 'disabled' : 'enabled'} successfully`,
        });
        refetchSchedules();
      } else {
        const error = await response.text();
        throw new Error(error || 'Failed to toggle schedule');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update schedule",
        variant: "destructive",
      });
    }
  };

  const filteredSchedules = schedules?.filter((sch: any) => {
    const searchText = scheduleSearchText.toLowerCase();
    const textMatch = !searchText || 
      sch.batch?.toLowerCase().includes(searchText) ||
      sch.phase?.toLowerCase().includes(searchText) ||
      sch.subjectName?.toLowerCase().includes(searchText) ||
      sch.staffName?.toLowerCase().includes(searchText) ||
      sch.startDate?.includes(searchText) ||
      sch.endDate?.includes(searchText);
    const batchMatch = scheduleFilterBatch === 'all' || sch.batch === scheduleFilterBatch;
    const phaseMatch = scheduleFilterPhase === 'all' || sch.phase === scheduleFilterPhase;
    const subjectMatch = scheduleFilterSubject === 'all' || String(sch.subjectId) === scheduleFilterSubject;
    const staffMatch = scheduleFilterStaff === 'all' || String(sch.staffId) === scheduleFilterStaff;
    const scheduleDate = new Date(sch.startDate);
    const from = scheduleFromDate ? new Date(scheduleFromDate) : null;
    const to = scheduleToDate ? new Date(scheduleToDate) : null;
    const dateMatch = (!from || scheduleDate >= from) && (!to || scheduleDate <= to);
    return textMatch && batchMatch && phaseMatch && subjectMatch && staffMatch && dateMatch;
  }).sort((a: any, b: any) => b.id - a.id) || [];

  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);

  // Filter staff based on selected filters
  const filteredStaff = metadata?.staff?.filter((s: any) => {
    if (selectedBatchId === 'all' && selectedPhase === 'all' && selectedSubject === 'all') {
      return true;
    }
    const staffSchedules = schedules?.filter((sch: any) => {
      const scheduleDate = new Date(sch.startDate);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      const dateMatch = (!from || scheduleDate >= from) && (!to || scheduleDate <= to);
      return sch.staffId === s.id && dateMatch;
    }) || [];
    if (staffSchedules.length === 0) return false;
    return staffSchedules.some((sch: any) => {
      const batchMatch = selectedBatchId === 'all' || sch.batch === selectedBatchId;
      const phaseMatch = selectedPhase === 'all' || sch.phase === selectedPhase;
      const subjectMatch = selectedSubject === 'all' || String(sch.subjectId) === selectedSubject;
      return batchMatch && phaseMatch && subjectMatch;
    });
  }) || [];

  const handleExportPDF = () => {
    if (!selectedStaffId || !analytics || analytics.length === 0) return;
    const staffName = metadata?.staff.find((s: any) => s.id === Number(selectedStaffId))?.name || 'Staff';
    const relevantSchedules = schedules?.filter((s: any) => 
      s.staffId === Number(selectedStaffId) && 
      (selectedBatchId === 'all' || s.batch === selectedBatchId)
    ) || [];
    
    const formatDate = (dateStr: string) => {
      if (!dateStr || dateStr === 'N/A') return 'N/A';
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };
    
    const startDate = relevantSchedules.length > 0 ? formatDate(relevantSchedules[0].startDate) : 'N/A';
    const endDate = relevantSchedules.length > 0 ? formatDate(relevantSchedules[0].endDate) : 'N/A';
    const dateRange = `${startDate} to ${endDate}`;
    
    const firstBatch = analytics[0];
    const avgTeaching = (analytics.reduce((sum: number, b: any) => sum + (b.partAAverage || 0), 0) / analytics.length) / 10 * 100;
    const avgResearch = (analytics.reduce((sum: number, b: any) => sum + (b.partBAverage || 0), 0) / analytics.length) / 10 * 100;
    const tableRows = analytics.map((batchAnalytics: any) => {
      const batchSchedule = schedules?.find((s: any) => s.staffId === Number(selectedStaffId) && s.batch === batchAnalytics.batchId);
      const scheduleDate = batchSchedule?.startDate ? formatDate(batchSchedule.startDate) : 'N/A';
      const templateName = batchAnalytics.templateName || 'N/A';
      return `<tr><td>${batchAnalytics.batchId}</td><td>${batchAnalytics.phase||'N/A'}</td><td>${scheduleDate}</td><td>${templateName}</td><td>${batchAnalytics.batchStrength||0}</td><td>${batchAnalytics.totalRespondents||0}</td>${batchAnalytics.questionStats?.filter((q:any)=>q.section==='Part A'||!q.section).map((q:any)=>`<td>${q.averageMarks.toFixed(2)}</td>`).join('')}${batchAnalytics.questionStats?.filter((q:any)=>q.section==='Part B').map((q:any)=>`<td>${q.averageMarks.toFixed(2)}</td>`).join('')}<td style="font-weight:700;color:#16a34a">${((batchAnalytics.partAAverage||0)/10*100).toFixed(1)}%</td><td style="font-weight:700;color:#2563eb">${((batchAnalytics.partBAverage||0)/10*100).toFixed(1)}%</td></tr>`;
    }).join('');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Feedback Report - ${staffName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;padding:40px;color:#333;line-height:1.6;background:#fff}.header{text-align:center;margin-bottom:30px;padding-bottom:15px;border-bottom:3px solid #dc2626}h1{font-size:24px;color:#dc2626;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}.subtitle{color:#555;font-size:13px;margin-bottom:3px;font-weight:500}.date-info{color:#777;font-size:11px;font-style:italic}table{width:100%;border-collapse:collapse;margin:25px 0;font-size:11px;box-shadow:0 0 20px rgba(0,0,0,0.1)}thead tr{background:#dc2626!important;color:#fff!important}th{padding:12px 8px;text-align:center;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.3);background:#dc2626!important;color:#fff!important}th:last-child{border-right:none}tbody tr{background:#fff;border-bottom:1px solid #ddd}tbody tr:nth-child(even){background:#f9f9f9}tbody tr:hover{background:#f5f5f5}td{padding:10px 8px;text-align:center;border-right:1px solid #e0e0e0;font-size:11px}td:last-child{border-right:none}td:first-child{font-weight:600;color:#dc2626;text-align:left;padding-left:12px}.summary{margin-top:30px;padding:15px 20px;background:#fff;border:2px solid #dc2626;border-radius:4px}.summary-title{font-size:14px;font-weight:700;margin-bottom:8px;color:#dc2626;text-transform:uppercase}.summary-text{font-size:12px;color:#555;line-height:1.8}@media print{body{padding:15px}table{font-size:10px}th,td{padding:8px 6px}thead tr{background:#dc2626!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}th{background:#dc2626!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="header"><h1>Consolidated Feedback Report</h1><p class="subtitle">Staff: ${staffName} | Batch: ${selectedBatchId==='all'?'All Batches':selectedBatchId}</p><p class="date-info">Feedback Period: ${dateRange}</p></div><table><thead><tr><th>Batch</th><th>Phase</th><th>Date</th><th>Template</th><th>Strength</th><th>Responses</th>${firstBatch.questionStats?.filter((q:any)=>q.section==='Part A'||!q.section).map((_:any,i:number)=>`<th>A${i+1}</th>`).join('')}${firstBatch.questionStats?.filter((q:any)=>q.section==='Part B').map((_:any,i:number)=>`<th>B${i+1}</th>`).join('')}<th>TEA%</th><th>REA%</th></tr></thead><tbody>${tableRows}</tbody></table><div class="summary"><div class="summary-title">Summary</div><div class="summary-text">Overall teaching effectiveness: <strong style="color:#16a34a">${avgTeaching.toFixed(1)}%</strong> | Research effectiveness: <strong style="color:#2563eb">${avgResearch.toFixed(1)}%</strong></div></div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/z7i-logo-1.png" alt="Z7i Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold">Admin Portal</h1>
              <p className="text-xs text-muted-foreground">Logged in as {user && typeof user === 'object' && 'username' in user ? String(user.username) : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Feedback Management</h2>
            <p className="text-lg text-gray-600">Comprehensive analytics and schedule management for educational feedback</p>
          </div>
          <CreateScheduleDialog />
        </div>

        <Tabs defaultValue="analytics" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2 h-12 p-1 bg-gray-100 rounded-xl">
            <TabsTrigger value="analytics" className="flex items-center gap-2 h-10 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              <span className="font-medium">Analytics Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex items-center gap-2 h-10 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CalendarRange className="h-4 w-4" />
              <span className="font-medium">Schedule Management</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-8">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
              <CardHeader className="pb-8">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Filters</h3>
                  <p className="text-sm text-gray-600">Select criteria to generate detailed feedback analytics</p>
                </div>
                
                <div className="space-y-6">
                  {/* Primary Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Batch</label>
                      <Select onValueChange={setSelectedBatchId} value={selectedBatchId}>
                        <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <SelectValue placeholder="All Batches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Batches</SelectItem>
                          {metadata?.batches.map((b: string) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Phase</label>
                      <Select onValueChange={setSelectedPhase} value={selectedPhase}>
                        <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <SelectValue placeholder="All Phases" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Phases</SelectItem>
                          {[1,2,3,4,5,6,7,8,9,10,'R'].map(p => (
                            <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Subject</label>
                      <Select onValueChange={setSelectedSubject} value={selectedSubject}>
                        <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {metadata?.subjects?.map((sub: { id: number; name: string }) => (
                            <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Staff Member</label>
                      <Select onValueChange={setSelectedStaffId} value={selectedStaffId}>
                        <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStaff.map((s: { id: number; name: string }) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Date Range Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">From Date</label>
                      <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">To Date</label>
                      <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                      />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <Button 
                      onClick={handleSearch} 
                      disabled={!selectedStaffId}
                      className="px-8 py-3 h-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Generate Analytics
                    </Button>
                    <Button 
                      onClick={handleReset} 
                      variant="outline"
                      className="px-8 py-3 h-auto border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-lg transition-all duration-200"
                    >
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {!showAnalytics ? (
                  <div className="text-center py-16">
                    <div className="bg-blue-50 rounded-xl p-8 max-w-md mx-auto">
                      <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Generate Analytics</h3>
                      <p className="text-gray-600">Select your filters above and click "Generate Analytics" to view detailed feedback data</p>
                    </div>
                  </div>
                ) : !selectedStaffId ? (
                  <div className="text-center py-16">
                    <div className="bg-amber-50 rounded-xl p-8 max-w-md mx-auto">
                      <FileText className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Staff Selection Required</h3>
                      <p className="text-gray-600">Please select a staff member to view their analytics</p>
                    </div>
                  </div>
                ) : analytics && analytics.length > 0 ? (
                  <div className="space-y-8">
                    {/* Analytics Table */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-600 hover:to-red-700">
                              <TableHead className="text-white font-bold py-4 px-6 text-left">Batch</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4 text-center">Phase</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4 text-center">Date</TableHead>
                              <TableHead className="text-white font-bold py-4 px-3 text-center w-24">Template</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4 text-center">Batch<br/>Strength</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4 text-center">Responses</TableHead>
                              {analytics[0].questionStats?.filter((q: any) => q.section === 'Part A' || !q.section).map((q: any, idx: number) => (
                                <TableHead key={`a${idx+1}`} className="text-white font-bold py-4 px-3 text-center min-w-[60px]">A{idx+1}</TableHead>
                              ))}
                              {analytics[0].questionStats?.filter((q: any) => q.section === 'Part B').map((q: any, idx: number) => (
                                <TableHead key={`b${idx+1}`} className="text-white font-bold py-4 px-3 text-center min-w-[60px]">B{idx+1}</TableHead>
                              ))}
                              <TableHead className="text-white font-bold py-4 px-4 text-center bg-green-600">TEA%</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4 text-center bg-blue-600">REA%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analytics.map((batchAnalytics: any, index: number) => (
                              <TableRow key={batchAnalytics.batchId} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                                <TableCell className="font-bold text-red-700 py-4 px-6">{batchAnalytics.batchId}</TableCell>
                                <TableCell className="text-center py-4 px-4 font-medium">{batchAnalytics.phase || 'N/A'}</TableCell>
                                <TableCell className="text-center py-4 px-4 text-sm">{schedules?.find((s: any) => s.staffId === Number(selectedStaffId) && s.batch === batchAnalytics.batchId)?.startDate ? (() => {
                                  const dateStr = schedules.find((s: any) => s.staffId === Number(selectedStaffId) && s.batch === batchAnalytics.batchId)?.startDate;
                                  const date = new Date(dateStr);
                                  return `${date.getDate()}-${date.toLocaleString('en-US', { month: 'short' })}-${date.getFullYear()}`;
                                })() : 'N/A'}</TableCell>
                                <TableCell className="text-center py-4 px-3 text-xs font-medium text-gray-700 max-w-24">
                                  <div className="truncate" title={batchAnalytics.templateName || 'N/A'}>
                                    {batchAnalytics.templateName || 'N/A'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-4 px-4 font-bold text-gray-900">{batchAnalytics.batchStrength || 0}</TableCell>
                                <TableCell className="text-center py-4 px-4 font-bold text-blue-700">{batchAnalytics.totalRespondents || 0}</TableCell>
                                {batchAnalytics.questionStats?.filter((q: any) => q.section === 'Part A' || !q.section).map((q: any, idx: number) => (
                                  <TableCell key={`val-a${idx+1}`} className="text-center py-4 px-3 font-semibold text-gray-800">{q.averageMarks.toFixed(2)}</TableCell>
                                ))}
                                {batchAnalytics.questionStats?.filter((q: any) => q.section === 'Part B').map((q: any, idx: number) => (
                                  <TableCell key={`val-b${idx+1}`} className="text-center py-4 px-3 font-semibold text-gray-800">{q.averageMarks.toFixed(2)}</TableCell>
                                ))}
                                <TableCell className="text-center py-4 px-4 font-bold text-green-700 bg-green-50">{((batchAnalytics.partAAverage || 0) / 10 * 100).toFixed(1)}%</TableCell>
                                <TableCell className="text-center py-4 px-4 font-bold text-blue-700 bg-blue-50">{((batchAnalytics.partBAverage || 0) / 10 * 100).toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200 shadow-lg">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-gray-900">Overall Performance Summary</h3>
                          <div className="flex flex-col sm:flex-row gap-4 text-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                              <span className="font-medium text-gray-700">Teaching Effectiveness:</span>
                              <span className="font-bold text-green-700 text-xl">{((analytics.reduce((sum: number, b: any) => sum + (b.partAAverage || 0), 0) / analytics.length) / 10 * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                              <span className="font-medium text-gray-700">Research Effectiveness:</span>
                              <span className="font-bold text-blue-700 text-xl">{((analytics.reduce((sum: number, b: any) => sum + (b.partBAverage || 0), 0) / analytics.length) / 10 * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={handleExportPDF} 
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 h-auto font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          <Download className="h-5 w-5 mr-2" />
                          Export PDF Report
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                      <p className="text-gray-600">No analytics data found for the selected criteria. Try adjusting your filters.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedules" className="mt-8">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
              <CardHeader className="pb-8">
                <div className="mb-6">
                  <CardTitle className="text-xl font-semibold text-gray-900">Scheduled Sessions</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">Manage and monitor feedback schedules across all batches</CardDescription>
                </div>
                
                <div className="space-y-6">
                  {/* Search Bar */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Search Sessions</label>
                    <div className="flex gap-4">
                      <Input
                        type="text"
                        placeholder="Search by batch, phase, subject, staff, or date..."
                        value={scheduleSearchText}
                        onChange={(e) => setScheduleSearchText(e.target.value)}
                        className="flex-1 h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                      />
                      <Button 
                        onClick={handleScheduleReset} 
                        variant="outline"
                        className="px-6 h-11 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-lg transition-all duration-200"
                      >
                        Reset All
                      </Button>
                    </div>
                  </div>
                  
                  {/* Filter Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Batch</label>
                      <Select onValueChange={setScheduleFilterBatch} value={scheduleFilterBatch}>
                        <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <SelectValue placeholder="All Batches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Batches</SelectItem>
                          {metadata?.batches.map((b: string) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Phase</label>
                      <Select onValueChange={setScheduleFilterPhase} value={scheduleFilterPhase}>
                        <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <SelectValue placeholder="All Phases" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Phases</SelectItem>
                          {[1,2,3,4,5,6,7,8,9,10,'R'].map(p => (
                            <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Subject</label>
                      <Select onValueChange={setScheduleFilterSubject} value={scheduleFilterSubject}>
                        <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {metadata?.subjects?.map((sub: { id: number; name: string }) => (
                            <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Staff</label>
                      <Select onValueChange={setScheduleFilterStaff} value={scheduleFilterStaff}>
                        <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <SelectValue placeholder="All Staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          {metadata?.staff?.map((s: { id: number; name: string }) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">From Date</label>
                      <Input
                        type="date"
                        value={scheduleFromDate}
                        onChange={(e) => setScheduleFromDate(e.target.value)}
                        className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">To Date</label>
                      <Input
                        type="date"
                        value={scheduleToDate}
                        onChange={(e) => setScheduleToDate(e.target.value)}
                        className="h-11 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {filteredSchedules.length > 0 ? (
                  <div className="space-y-6">
                    {/* Schedules Table */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-700">
                              <TableHead className="text-white font-bold py-4 px-6">Batch</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4">Phase</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4">Subject</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4">Staff</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4">Start Date</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4">End Date</TableHead>
                              <TableHead className="text-white font-bold py-4 px-4 text-center">Status</TableHead>
                              <TableHead className="text-white font-bold py-4 px-6 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedSchedules.map((schedule: any, index: number) => (
                              <TableRow key={schedule.id} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                                <TableCell className="font-bold text-blue-700 py-4 px-6">{schedule.batch}</TableCell>
                                <TableCell className="py-4 px-4 font-medium">{schedule.phase}</TableCell>
                                <TableCell className="py-4 px-4">{schedule.subjectName}</TableCell>
                                <TableCell className="py-4 px-4 font-medium">{schedule.staffName}</TableCell>
                                <TableCell className="py-4 px-4 text-sm">{schedule.startDate}</TableCell>
                                <TableCell className="py-4 px-4 text-sm">{schedule.endDate}</TableCell>
                                <TableCell className="py-4 px-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                    schedule.isActive 
                                      ? 'bg-green-100 text-green-800 border border-green-200' 
                                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                                  }`}>
                                    {schedule.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setEditingSchedule(schedule)}
                                      className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                    <Button 
                                      variant={schedule.isActive ? "destructive" : "default"} 
                                      size="sm"
                                      onClick={() => handleToggleSchedule(schedule.id, schedule.isActive)}
                                      className={schedule.isActive 
                                        ? "bg-red-600 hover:bg-red-700" 
                                        : "bg-green-600 hover:bg-green-700"
                                      }
                                    >
                                      {schedule.isActive ? 'Disable' : 'Enable'}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 font-medium">
                          Showing <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredSchedules.length)}</span> of <span className="font-bold text-gray-900">{filteredSchedules.length}</span> schedules
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="border-2 border-gray-300 hover:border-gray-400"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let page;
                              if (totalPages <= 5) {
                                page = i + 1;
                              } else if (currentPage <= 3) {
                                page = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i;
                              } else {
                                page = currentPage - 2 + i;
                              }
                              return (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className={`w-10 h-10 ${
                                    currentPage === page 
                                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                      : "border-2 border-gray-300 hover:border-gray-400"
                                  }`}
                                >
                                  {page}
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="border-2 border-gray-300 hover:border-gray-400"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
                      <CalendarRange className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedules Found</h3>
                      <p className="text-gray-600">No schedules match your current filters. Try adjusting your search criteria or create a new schedule.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <EditScheduleDialog
          schedule={editingSchedule}
          open={!!editingSchedule}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
          onSuccess={refetchSchedules}
        />
      </main>
    </div>
  );
}
