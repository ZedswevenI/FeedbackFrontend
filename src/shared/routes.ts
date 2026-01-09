import { z } from "zod";

// Get API base URL from environment variables
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
};

export const api = {
  auth: {
    login: {
      path: "/api/feedback/auth/login",
      method: "POST",
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.object({
          username: z.string(),
          role: z.string(),
          batch: z.string().optional().nullable(),
          token: z.string(),
        }),
      },
    },
    logout: {
      path: "/api/feedback/auth/logout",
      method: "POST",
    },
    user: {
      path: "/api/feedback/auth/user",
      responses: {
        200: z.object({
          username: z.string(),
          role: z.string(),
          batch: z.string().optional().nullable(),
        }),
      },
    },
  },
  admin: {
    metadata: {
      path: "/api/feedback/admin/metadata",
      responses: {
        200: z.object({
          staff: z.array(z.object({
            id: z.number(),
            name: z.string(),
          })),
          subjects: z.array(z.object({
            id: z.number(),
            name: z.string(),
          })),
          batches: z.array(z.string()),
          templates: z.array(z.object({
            id: z.number(),
            name: z.string(),
            description: z.string(),
          })),
        }),
      },
    },
    schedule: {
      path: "/api/feedback/admin/schedule",
      method: "POST",
      input: z.object({
        batch: z.string(),
        phase: z.string(),
        subjectId: z.number(),
        staffIds: z.array(z.number()),
        templateId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }),
      responses: {
        201: z.object({
          message: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
      },
    },
    schedules: {
      path: "/api/feedback/admin/schedules",
      responses: {
        200: z.array(z.any()),
      },
    },
    analytics: {
      path: "/api/feedback/admin/analytics/:staffId",
      responses: {
        200: z.array(z.object({
          staffId: z.number().optional(),
          staffName: z.string().optional(),
          batchId: z.string(),
          totalRespondents: z.number(),
          batchStrength: z.number(),
          subjectName: z.string(),
          phase: z.string(),
          templateName: z.string().optional(),
          overallAverage: z.number(),
          partAAverage: z.number(),
          partBAverage: z.number(),
          questionStats: z.array(z.object({
            questionId: z.number(),
            questionText: z.string(),
            section: z.string(),
            averageMarks: z.number(),
          })),
        })),
      },
    },
  },
  student: {
    activeFeedback: {
      path: "/api/feedback/student/active-feedback",
      responses: {
        200: z.array(z.object({
          id: z.number(),
          subject: z.object({
            id: z.number(),
            name: z.string(),
          }),
          staff: z.object({
            id: z.number(),
            name: z.string(),
          }),
          phase: z.string(),
          endDate: z.string(),
          isCompleted: z.boolean(),
          templateId: z.number(),
        })),
      },
    },
    submit: {
      path: "/api/feedback/student/submit",
      method: "POST",
      input: z.array(z.object({
        schedule_id: z.number(),
        question_id: z.number(),
        option_id: z.number(),
        marks: z.number(),
        staff_id: z.number(),
        batch_id: z.string(),
        subject_id: z.number(),
        remarks: z.string().optional(),
      })),
      responses: {
        200: z.object({
          message: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
      },
    },
  },
  templates: {
    questions: {
      path: "/api/feedback/templates/:templateId/questions",
      responses: {
        200: z.object({
          templateId: z.number(),
          templateName: z.string(),
          sections: z.array(z.object({
            sectionName: z.string(),
            questions: z.array(z.object({
              id: z.number(),
              questionText: z.string(),
              orderIndex: z.number(),
              options: z.array(z.object({
                id: z.number(),
                optionText: z.string(),
                marks: z.number(),
                orderIndex: z.number(),
              })),
            })),
          })),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params: Record<string, any> = {}) {
  const baseUrl = getApiBaseUrl();
  let url = path;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  return `${baseUrl}${url}`;
}

export type User = z.infer<typeof api.auth.user.responses[200]>;
export type SubmitFeedbackRequest = z.infer<typeof api.student.submit.input>[number];
