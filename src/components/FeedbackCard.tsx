import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface FeedbackCardProps {
  id: number;
  subject: { name: string };
  staff: { name: string };
  phase: string;
  endDate: string;
  isCompleted: boolean;
}

export function FeedbackCard({ id, subject, staff, phase, endDate, isCompleted }: FeedbackCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full border border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg hover:border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <Badge variant={isCompleted ? "secondary" : "default"} className="mb-2">
              {phase}
            </Badge>
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
          </div>
          <CardTitle className="text-xl font-bold font-display text-foreground">
            {subject.name}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground/80">
            {staff.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Due by {format(new Date(endDate), "MMMM d, yyyy")}</span>
          </div>
        </CardContent>
        <CardFooter>
          {isCompleted ? (
            <Button disabled variant="outline" className="w-full bg-secondary/50">
              Completed
            </Button>
          ) : (
            <Link href={`/student/feedback/${id}`} className="w-full">
              <Button className="w-full group">
                Start Feedback
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
