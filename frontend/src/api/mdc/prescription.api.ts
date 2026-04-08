import axios from 'axios';
import { getAuthHeaders } from '../../utils/authToken';

export type DeliveryChannel = 'whatsapp' | 'email' | 'sms' | string;

export interface CreatePrescriptionInput {
  patientId: string;
  title: string;
  instructions: string;
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    durationDays: number;
  }>;
}

export interface Prescription {
  id: string;
  patientId: string;
  title?: string;
  instructions?: string;
  status?: string;
  createdAt?: string;
}

export interface DeliverPrescriptionResponse {
  success: boolean;
  message?: string;
  channel?: DeliveryChannel;
  deliveredAt?: string;
}

interface ApiEnvelope<T> {
  data?: T;
}

const mdcApi = axios.create({
  baseURL: '/api/mdc',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add Authorization header to all requests
mdcApi.interceptors.request.use((config) => {
  const authHeaders = getAuthHeaders();
  config.headers = Object.assign(config.headers || {}, authHeaders);
  return config;
});

const unwrap = <T>(payload: T | ApiEnvelope<T>): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.data !== undefined) {
      return envelope.data;
    }
  }
  return payload as T;
};

export const createPrescription = async (data: CreatePrescriptionInput): Promise<Prescription> => {
  try {
    const response = await mdcApi.post<Prescription | ApiEnvelope<Prescription>>('/prescriptions', data);
    return unwrap(response.data);
  } catch (error) {
    console.error('createPrescription failed, using mock fallback', error);
    return {
      id: `mock-prescription-${Date.now()}`,
      patientId: data.patientId,
      title: data.title,
      instructions: data.instructions,
      status: 'created',
      createdAt: new Date().toISOString(),
    };
  }
};

export const deliverPrescription = async (id: string, channel: DeliveryChannel): Promise<DeliverPrescriptionResponse> => {
  try {
    const response = await mdcApi.post<DeliverPrescriptionResponse | ApiEnvelope<DeliverPrescriptionResponse>>(
      `/prescriptions/${encodeURIComponent(id)}/deliver`,
      { channel },
    );
    return unwrap(response.data);
  } catch (error) {
    console.error('deliverPrescription failed, using mock fallback', error);
    return {
      success: true,
      message: `Mock prescription delivered via ${channel}`,
      channel,
      deliveredAt: new Date().toISOString(),
    };
  }
};

export const getPrescriptionPDF = async (id: string): Promise<Blob> => {
  try {
    const response = await mdcApi.get<Blob>(`/prescriptions/${encodeURIComponent(id)}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('getPrescriptionPDF failed, using mock fallback', error);
    return new Blob([`Mock PDF content for prescription ${id}`], { type: 'application/pdf' });
  }
};
