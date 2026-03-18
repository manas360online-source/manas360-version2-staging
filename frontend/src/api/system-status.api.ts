import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface SystemStatus {
  id: number;
  isLive: boolean;
  launchedBy?: string | null;
  launchedAt?: string | null;
}

export const getSystemStatus = async (): Promise<SystemStatus> => {
  const response = await axios.get(`${API_BASE_URL}/v1/system-status/status`);
  return response.data.data;
};

export const activateSystem = async (pin: string, signature: string): Promise<SystemStatus> => {
  const response = await axios.post(`${API_BASE_URL}/v1/system-status/activate`, {
    pin,
    signature,
    actor: 'ADMIN_LAUNCH'
  });
  return response.data.data;
};
