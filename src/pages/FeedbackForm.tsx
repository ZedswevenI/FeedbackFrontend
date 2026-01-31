import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useActiveFeedback, useSubmitFeedback } from "@/hooks/use-student";
import { useAuth, getToken } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";
import { api, type SubmitFeedbackRequest, buildUrl } from "@shared/routes";

// Sanitize user input to prevent XSS
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/[<>"'&]/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    })
    .slice(0, 1000); // Limit length
};

export default function FeedbackForm() {
  const [, params] = useRoute("/student/feedback/:id");
  const [, setLocation] = useLocation();
  const { data: feedbackList } = useActiveFeedback();
  const { user } = useAuth();
  const { mutate: submitFeedback, isPending } = useSubmitFeedback();
  
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [sections, setSections] = useState<Array<{sectionName: string; questions: Array<{id: number; text: string; options: Array<{id: number; optionText: string; marks: number}>}>}>>([]);
  const [loading, setLoading] = useState(true);
  
  const scheduleId = Number(params?.id);
  const currentFeedback = feedbackList?.find(f => f.id === scheduleId);
  const storageKey = `feedback_answers_${scheduleId}_${user && typeof user === 'object' && 'username' in user ? user.username : 'guest'}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved answers', e);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, storageKey]);

  useEffect(() => {
    if (currentFeedback?.templateId) {
      const controller = new AbortController();
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

  useEffect(() => {
    if (feedbackList && !currentFeedback) {
      setLocation("/student");
    }
  }, [feedbackList, currentFeedback, setLocation]);

  if (!currentFeedback || !user || loading) return null;

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const progress = (Object.keys(answers).length / totalQuestions) * 100;

  const handleSubmit = () => {
    if (Object.keys(answers).length !== totalQuestions) return;
    if (!user || typeof user !== 'object' || !('batch' in user) || !user.batch) return;

    const payload: SubmitFeedbackRequest[] = Object.entries(answers).map(([qId, optionId]) => {
      const question = sections.flatMap(s => s.questions).find(q => q.id === Number(qId));
      const option = question?.options.find(o => o.id === optionId);
      
      return {
        schedule_id: scheduleId,
        question_id: Number(qId),
        option_id: optionId,
        marks: option?.marks || 0,
        staff_id: currentFeedback.staff.id,
        batch_id: (user as any).batch || "",
        subject_id: currentFeedback.subject.id,
      };
    });

    submitFeedback(payload, {
      onSuccess: (response: any) => {
        localStorage.removeItem(storageKey);
        // Don't show alert here - hook handles toast
        setLocation("/student");
      },
      onError: (error) => {
        console.error('Submission failed:', error);
        // Don't show alert here - hook handles toast
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/student")} className="pl-0 hover:pl-2 transition-all">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {Object.keys(answers).length} / {totalQuestions} Answered
            </span>
          </div>
          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">{currentFeedback.subject.name}</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Feedback for {currentFeedback.staff.name} • {currentFeedback.phase}
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h2 className="text-2xl font-display font-bold mb-6 text-primary">{section.sectionName}</h2>
              {section.questions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="mb-6"
                >
                  <Card className={`border-l-4 ${answers[q.id] ? "border-l-primary" : "border-l-transparent"} hover:shadow-md transition-shadow`}>
                    <CardHeader>
                      <CardTitle className="text-base font-medium leading-relaxed">
                        <span className="text-muted-foreground mr-2">{index + 1}.</span>
                        <span dangerouslySetInnerHTML={{ __html: sanitizeInput(q.text) }} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup 
                        onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: Number(val) }))}
                        value={answers[q.id] ? String(answers[q.id]) : undefined}
                        className="flex flex-col gap-3"
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
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-end">
          <Button 
            size="lg" 
            className="w-full sm:w-auto px-8 py-6 text-lg shadow-xl shadow-primary/20"
            disabled={Object.keys(answers).length !== totalQuestions || isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Feedback
                <Send className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
