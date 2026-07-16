export type ProspectStatus =
  | 'NEW'
  | 'SENT'
  | 'REPLIED'
  | 'INTERESTED'
  | 'MEETING'
  | 'PROPOSAL'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type TemplateCategory =
  | 'WEBSITE_OFFER'
  | 'SEO'
  | 'BRANDING'
  | 'MAINTENANCE'
  | 'FOLLOW_UP'
  | 'GENERAL';

export type ActivityType =
  | 'IMPORTED'
  | 'EDITED'
  | 'STATUS_CHANGED'
  | 'MESSAGE_GENERATED'
  | 'FOLLOW_UP_CHANGED'
  | 'TEMPLATE_USED'
  | 'NOTE_ADDED';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Prospect {
  id: string;
  companyName: string;
  instagramHandle: string | null;
  website: string | null;
  phoneNumber: string | null;
  sourceUrl: string | null;
  score: number;
  hasWebsite: boolean;
  status: ProspectStatus;
  followUpDate: string | null;
  lastContactDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  noteEntries?: Note[];
  activities?: Activity[];
}

export interface Note {
  id: string;
  prospectId: string;
  content: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  prospectId: string;
  type: ActivityType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProspectFilters {
  search?: string;
  status?: ProspectStatus;
  hasWebsite?: boolean;
  scoreMin?: number;
  scoreMax?: number;
  followUp?: 'today' | 'overdue' | 'upcoming' | 'none';
  hasInstagram?: boolean;
  hasPhone?: boolean;
  hasWebsiteUrl?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: 'New',
  SENT: 'Sent',
  REPLIED: 'Replied',
  INTERESTED: 'Interested',
  MEETING: 'Meeting',
  PROPOSAL: 'Proposal',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value: value as ProspectStatus,
  label,
}));

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  WEBSITE_OFFER: 'Website Offer',
  SEO: 'SEO',
  BRANDING: 'Branding',
  MAINTENANCE: 'Maintenance',
  FOLLOW_UP: 'Follow Up',
  GENERAL: 'General',
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  IMPORTED: 'Imported',
  EDITED: 'Edited',
  STATUS_CHANGED: 'Status Changed',
  MESSAGE_GENERATED: 'Message Generated',
  FOLLOW_UP_CHANGED: 'Follow Up Changed',
  TEMPLATE_USED: 'Template Used',
  NOTE_ADDED: 'Note Added',
};
