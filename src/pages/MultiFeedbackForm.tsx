import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useActiveFeedback, useSubmitFeedback } from "@/hooks/use-student";
import { useAuth, getToken } from "@/hooks/use-auth";
import { useTokenExpiryWarning } from "@/hooks/use-token-expiry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react";
import { buildUrl, api, type SubmitFeedbackRequest } from "@shared/routes";

export default function MultiFeedbackForm() {
  const [, setLocation] = useLocation();
  const { data: feedbackList } = useActiveFeedback();
  const { user } = useAuth();
  const { mutate: submitFeedback, isPending } = useSubmitFeedback();
  useTokenExpiryWarning();
  
  const [currentStaffIndex, setCurrentStaffIndex] = useState(0);
  const [allAnswers, setAllAnswers] = useState<Record<number, Record<number, number>>>({});
  const [allRemarks, setAllRemarks] = useState<Record<number, string>>({});
  const [sections, setSections] = useState<Array<{sectionName: string; questions: Array<{id: number; text: string; options: Array<{id: number; optionText: string; marks: number}>}>}>>([]);
  const [loading, setLoading] = useState(true);
  const [templateCache, setTemplateCache] = useState<Record<number, any>>({});
  
  const pendingFeedback = feedbackList?.filter(f => !f.isCompleted) || [];
  const currentFeedback = pendingFeedback[currentStaffIndex];
  const isLastStaff = currentStaffIndex === pendingFeedback.length - 1;
  const currentAnswers = allAnswers[currentFeedback?.id] || {};
  const storageKey = `multi_feedback_${user && typeof user === 'object' && 'username' in user ? user.username : 'guest'}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAllAnswers(data.answers || {});
        setAllRemarks(data.remarks || {});
        setCurrentStaffIndex(data.currentIndex || 0);
      } catch (e) {
        console.error('Failed to load saved feedback', e);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (Object.keys(allAnswers).length > 0 || Object.keys(allRemarks).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify({
        answers: allAnswers,
        remarks: allRemarks,
        currentIndex: currentStaffIndex
      }));
    }
  }, [allAnswers, allRemarks, currentStaffIndex, storageKey]);

  useEffect(() => {
    if (currentFeedback?.templateId) {
      const controller = new AbortController();
      setLoading(true);
      const url = buildUrl(api.templates.questions.path, { templateId: currentFeedback.templateId });
      const token = getToken();
      
      fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: controller.signal
      })
        .then(res => res.json())
        .then(data => {
          if (!controller.signal.aborted) {
            setSections(data.sections.map((s: any) => ({
              sectionName: s.sectionName,
              questions: s.questions.map((q: any) => ({ 
                id: q.id, 
                text: q.questionText,
                options: q.options 
              }))
            })));
            setTemplateCache(prev => ({ ...prev, [currentFeedback.templateId]: data }));
            setLoading(false);
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            console.error('Fetch error:', error);
            setLoading(false);
          }
        });
      
      return () => controller.abort();
    }
  }, [currentFeedback?.templateId]);

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = Object.keys(currentAnswers).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  const isCurrentStaffComplete = answeredQuestions === totalQuestions;

  const handleAnswer = (questionId: number, optionId: number) => {
    setAllAnswers(prev => ({
      ...prev,
      [currentFeedback.id]: {
        ...prev[currentFeedback.id],
        [questionId]: optionId
      }
    }));
  };

  const handleNext = () => {
    if (isCurrentStaffComplete && !isLastStaff) {
      setCurrentStaffIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStaffIndex > 0) {
      setCurrentStaffIndex(prev => prev - 1);
    }
  };

  const handleSubmitAll = async () => {
    if (!user || typeof user !== 'object' || !('batch' in user) || !user.batch) return;

    const allPayloads: SubmitFeedbackRequest[] = [];
    
    for (const feedback of pendingFeedback) {
      const answers = allAnswers[feedback.id];
      if (!answers) continue;
      
      const cachedTemplate = templateCache[feedback.templateId];
      const staffQuestions = cachedTemplate.sections.flatMap((s: any) => 
        s.questions.map((q: any) => ({ 
          id: q.id, 
          options: q.options 
        }))
      );
      
      Object.entries(answers).forEach(([qId, optionId]) => {
        const question = staffQuestions.find((q: any) => q.id === Number(qId));
        const option = question?.options.find((o: any) => o.id === optionId);
        
        allPayloads.push({
          schedule_id: feedback.id,
          question_id: Number(qId),
          option_id: optionId,
          marks: option?.marks || 0,
          staff_id: feedback.staff.id,
          batch_id: (user as any).batch || "",
          subject_id: feedback.subject.id,
          remarks: allRemarks[feedback.id] || "",
        });
      });
    }

    // Submit with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptSubmit = async (): Promise<any> => {
      try {
        const result = await new Promise((resolve, reject) => {
          submitFeedback(allPayloads, {
            onSuccess: (response: any) => resolve(response),
            onError: (error: any) => reject(error)
          });
        });
        return result;
      } catch (error: any) {
        if (retryCount < maxRetries && error?.message?.includes('already submitted')) {
          return { status: 'already_completed' };
        }
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return attemptSubmit();
        }
        throw error;
      }
    };

    try {
      await attemptSubmit();
      localStorage.removeItem(storageKey);
      setLocation("/student");
    } catch (error) {
      console.error('Final submission failed:', error);
    }
  };

  if (!currentFeedback || loading) return null;

  // Check if all staff feedbacks are truly complete
  const allStaffComplete = pendingFeedback.every(feedback => {
    const answers = allAnswers[feedback.id];
    return answers && Object.keys(answers).length > 0;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/student")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <span className="text-sm font-medium">
              Staff {currentStaffIndex + 1} of {pendingFeedback.length} | {answeredQuestions} / {totalQuestions} Answered
            </span>
          </div>
          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{currentFeedback.subject.name}</h1>
          <p className="text-lg text-muted-foreground mt-1">
            {currentFeedback.staff.name} • {currentFeedback.phase}
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h2 className="text-2xl font-bold mb-6 text-primary">{section.sectionName}</h2>
              {section.questions.map((q, index) => (
                <div key={q.id} className={`mb-8 p-6 border rounded-lg ${currentAnswers[q.id] ? "border-primary" : "border-gray-200"}`}>
                  <h3 className="text-lg font-medium mb-4">
                    <span className="text-muted-foreground mr-3">{index + 1}.</span>
                    {q.text}
                  </h3>
                  <RadioGroup 
                    onValueChange={(val) => handleAnswer(q.id, Number(val))}
                    value={currentAnswers[q.id] ? String(currentAnswers[q.id]) : undefined}
                    key={`${currentFeedback.id}-${q.id}`}
                    className="flex flex-wrap gap-6"
                  >
                    {q.options?.map((opt) => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(opt.id)} id={`q${q.id}-${opt.id}`} />
                        <Label htmlFor={`q${q.id}-${opt.id}`} className="font-normal cursor-pointer text-sm">
                          {opt.optionText}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 border rounded-lg">
          <Label htmlFor="remarks" className="text-base font-medium mb-2 block">
            Remarks for {currentFeedback.staff.name} (Optional)
          </Label>
          <Textarea
            id="remarks"
            placeholder="Enter any additional comments or feedback for this staff member..."
            value={allRemarks[currentFeedback.id] || ""}
            onChange={(e) => setAllRemarks(prev => ({ ...prev, [currentFeedback.id]: e.target.value }))}
            className="min-h-[100px]"
          />
        </div>

        <div className="mt-12 flex justify-between gap-4">
          <Button 
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStaffIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous Staff
          </Button>

          {!isLastStaff ? (
            <Button 
              onClick={handleNext}
              disabled={!isCurrentStaffComplete}
            >
              Next Staff
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmitAll}
              disabled={!allStaffComplete || !isCurrentStaffComplete || isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit All Feedback
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
