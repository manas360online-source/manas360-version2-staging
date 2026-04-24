import { publicHttp } from './publicHttp';

export interface RetreatIntentInput {
  name: string;
  phone: string;
  email?: string;
  theme: string;
  preferredDates?: string;
  groupSize?: string;
  budgetRange?: string;
  personalNote?: string;
  consentContact: boolean;
}

export const submitRetreatIntentApi = async (data: RetreatIntentInput) => {
  const response = await publicHttp.post('/v1/retreat/intent', data);
  return response.data;
};
