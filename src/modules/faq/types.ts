export type CreateFaqInput = {
  tenantId: string;
  question: string;
  answer: string;
  questionKm?: string | null;
  answerKm?: string | null;
  questionZh?: string | null;
  answerZh?: string | null;
  sortOrder?: number;
  isActive: boolean;
};

export type UpdateFaqInput = {
  tenantId: string;
  faqId: string;
  question: string;
  answer: string;
  questionKm?: string | null;
  answerKm?: string | null;
  questionZh?: string | null;
  answerZh?: string | null;
  sortOrder?: number;
  isActive: boolean;
};

export type AdminFaqListRow = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: Date;
};

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
  questionKm: string | null;
  answerKm: string | null;
  questionZh: string | null;
  answerZh: string | null;
};

export type FaqRecord = {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  questionKm: string | null;
  answerKm: string | null;
  questionZh: string | null;
  answerZh: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
};
