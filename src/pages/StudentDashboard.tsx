import { useAuth } from "@/hooks/use-auth";
import { useActiveFeedback } from "@/hooks/use-student";
import { Button } from "@/components/ui/button";
import { LogOut, CheckCircle, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const { data: feedbackList, isLoading } = useActiveFeedback();
  const [, setLocation] = useLocation();

  const pendingFeedback = feedbackList?.filter(f => !f.isCompleted) || [];
  const completedFeedback = feedbackList?.filter(f => f.isCompleted) || [];
  const hasPendingFeedback = pendingFeedback.length > 0;

  const handleStartFeedback = () => {
    if (hasPendingFeedback) {
      setLocation('/student/feedback/all');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/z7i-logo-1.png" alt="Z7i Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold font-display">Student Portal</h1>
              <p className="text-xs text-muted-foreground">{user && typeof user === 'object' && 'username' in user ? String(user.username) : ''} • {user && typeof user === 'object' && 'batch' in user ? String(user.batch) : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()} className="text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-display font-bold text-foreground">Your Feedback Tasks</h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Complete feedback for all your subjects in one go
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Skeleton className="h-64 w-full max-w-md" />
          </div>
        ) : hasPendingFeedback ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl p-8 border-2 border-primary/20 shadow-xl">
              <div className="flex items-center justify-center mb-6">
                <div className="h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center">
                  <ClipboardList className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-4">Pending Feedback</h3>
              <p className="text-center text-muted-foreground mb-6">
                You have <span className="font-bold text-primary">{pendingFeedback.length}</span> staff feedback(s) to complete
              </p>
              
              <div className="space-y-3 mb-6">
                {pendingFeedback.map((item) => (
                  <div key={item.id} className="bg-background/80 rounded-lg p-4 border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{item.subject.name}</p>
                        <p className="text-sm text-muted-foreground">{item.staff.name} • {item.phase}</p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Pending</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleStartFeedback}
                className="w-full h-12 text-lg font-semibold shadow-lg"
                size="lg"
              >
                Start Feedback Session
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Complete all feedbacks in one session and submit at the end
              </p>
            </div>

            {completedFeedback.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-4">Completed Feedback</h4>
                <div className="space-y-2">
                  {completedFeedback.map((item) => (
                    <div key={item.id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-green-900">{item.subject.name}</p>
                          <p className="text-sm text-green-700">{item.staff.name} • {item.phase}</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold font-display">All Caught Up!</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              You have no pending feedback forms at the moment. Great job!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
