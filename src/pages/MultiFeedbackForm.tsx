import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useActiveFeedback, useSubmitFeedback } from "@/hooks/use-student";
import { useAuth, getToken } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react";
import { buildUrl, api, type SubmitFeedbackRequest } from "@shared/routes";

export default function MultiFeedbackForm() {
  const [, setLocation] = useLocation();
  const { data: feedbackList } = useActiveFeedback();
  const { user } = useAuth();
  const { mutate: submitFeedback, isPending } = useSubmitFeedback();
  
  const [currentStaffIndex, setCurrentStaffIndex] = useState(0);
  const [allAnswers, setAllAnswers] = useState<Record<number, Record<number, number>>>({});
  const [sections, setSections] = useState<Array<{sectionName: string; questions: Array<{id: number; text: string; options: Array<{id: number; optionText: string; marks: number}>}>}>>([]);
  const [loading, setLoading] = useState(true);
  
  const pendingFeedback = feedbackList?.filter(f => !f.isCompleted) || [];
  const currentFeedback = pendingFeedback[currentStaffIndex];
  const isLastStaff = currentStaffIndex === pendingFeedback.length - 1;
  const currentAnswers = allAnswers[currentFeedback?.id] || {};

  useEffect(() => {
    if (currentFeedback?.templateId) {
      setLoading(true);
      const url = buildUrl(api.templates.questions.path, { templateId: currentFeedback.templateId });
      const token = getToken();
      fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
        .then(res => res.json())
        .then(data => {
          setSections(data.sections.map((s: any) => ({
            sectionName: s.sectionName,
            questions: s.questions.map((q: any) => ({ 
              id: q.id, 
              text: q.questionText,
              options: q.options 
            }))
          })));
          setLoading(false);
        })
        .catch(() => setLoading(false));
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
    if (!user || typeof user !== 'object' || !('batch' in user)) return;

    // Validate all staff feedbacks are complete
    for (const feedback of pendingFeedback) {
      const answers = allAnswers[feedback.id];
      if (!answers) return; // No answers for this staff
      
      const url = buildUrl(api.templates.questions.path, { templateId: feedback.templateId });
      const token = getToken();
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      const totalQuestionsForStaff = data.sections.reduce((sum: number, s: any) => sum + s.questions.length, 0);
      
      if (Object.keys(answers).length !== totalQuestionsForStaff) return; // Incomplete
    }

    const allPayloads: SubmitFeedbackRequest[] = [];
    
    for (const feedback of pendingFeedback) {
      const answers = allAnswers[feedback.id];
      
      const url = buildUrl(api.templates.questions.path, { templateId: feedback.templateId });
      const token = getToken();
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      const staffQuestions = data.sections.flatMap((s: any) => 
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
          batch_id: String(user.batch),
          subject_id: feedback.subject.id,
        });
      });
    }

    submitFeedback(allPayloads);
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
