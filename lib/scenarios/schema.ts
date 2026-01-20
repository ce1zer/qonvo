import { z } from "zod";

export const ScenarioPresetIdSchema = z.enum([
  "klant_in_winkel",
  "boze_klant",
  "feedbackgesprek",
  "sollicitatie"
]);
export type ScenarioPresetId = z.infer<typeof ScenarioPresetIdSchema>;

export const ScenarioUpsertSchema = z.object({
  name: z.string().trim().min(1, "Vul een naam in."),
  persona: z.string().trim().min(1, "Vul een persona in."),
  topic: z.string().trim().min(1, "Vul een onderwerp in."),
  instructions: z.string().trim().min(1, "Vul instructies in."),
  evaluationCriteria: z.string().trim().optional()
});

export type ScenarioUpsertInput = z.infer<typeof ScenarioUpsertSchema>;

export function zodToDutchFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export type ScenarioActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
  scenarioId?: string;
};

export const initialScenarioActionState: ScenarioActionState = { ok: false, message: "" };

