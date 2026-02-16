export interface Source {
  id: string;
  citation: string;
  type: 'book' | 'journal' | 'website' | 'conference' | 'other';
  author?: string;
  year?: number;
  title?: string;
  url?: string;
}

export interface ValidationResult {
  sourceId: string;
  isValid: boolean;
  score: number;
  checks: {
    urlAccessible: boolean | null;
    formatCorrect: boolean;
    credibleDomain: boolean | null;
    isRecent: boolean | null;
    hasRequiredFields: boolean;
  };
  issues: string[];
  warnings: string[];
}
