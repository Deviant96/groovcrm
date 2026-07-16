export type TemplateVars = {
  company?: string | null;
  instagram?: string | null;
  website?: string | null;
  phone?: string | null;
  score?: number | null;
};

export function renderTemplate(message: string, vars: TemplateVars): string {
  return message
    .replace(/\{\{\s*company\s*\}\}/gi, vars.company ?? '')
    .replace(/\{\{\s*instagram\s*\}\}/gi, vars.instagram ?? '')
    .replace(/\{\{\s*website\s*\}\}/gi, vars.website ?? '')
    .replace(/\{\{\s*phone\s*\}\}/gi, vars.phone ?? '')
    .replace(/\{\{\s*score\s*\}\}/gi, vars.score != null ? String(vars.score) : '');
}
