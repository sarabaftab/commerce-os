export type CreateFaqInput = {
  tenantId: string;
  question: string;
  answer: string;
  sortOrder?: number;
  isActive: boolean;
};

export type UpdateFaqInput = {
  tenantId: string;
  faqId: string;
  question: string;
  answer: string;
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
};

export type FaqRecord = {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
};
