import axios from 'axios';
import { getAuthHeaders } from '../../utils/authToken';

export interface Staff {
  id: string;
  clinicId: string;
  loginSuffix: string;
  loginCode: string;
  role: 'admin' | 'therapist';
  fullName: string;
  phone: string;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
}

const mdcApi = axios.create({
  baseURL: '/api/mdc',
  withCredentials: true,
});

mdcApi.interceptors.request.use((config) => {
  const authHeaders = getAuthHeaders();
  config.headers = Object.assign(config.headers || {}, authHeaders);
  return config;
});

export const getStaff = async (clinicId: string): Promise<Staff[]> => {
  const response = await mdcApi.get(`/clinics/${clinicId}/staff`);
  return response.data.data;
};

export const createStaff = async (clinicId: string, data: Partial<Staff>): Promise<Staff> => {
  const response = await mdcApi.post(`/clinics/${clinicId}/staff`, data);
  return response.data.data;
};

export const deactivateStaff = async (staffId: string): Promise<void> => {
  await mdcApi.delete(`/staff/${staffId}`);
};
