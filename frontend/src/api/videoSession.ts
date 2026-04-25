import { http } from '../lib/http';

type Envelope<T> = { success?: boolean; message?: string; data?: T } & T;

const unwrap = <T>(response: Envelope<T>): T => {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as unknown as T;
};

export type MeetingLinkResponse = {
  sessionId: string;
  meetingRoomName: string;
  jitsiJwt: string | null;
  jitsiDomain: string;
  patientId: string;
  noteId: string | null;
  noteSubjective: string;
};

export const generateMeetingLink = async (sessionId: string): Promise<MeetingLinkResponse> => {
  const response = await http.post<Envelope<MeetingLinkResponse>>(`/v1/provider/meeting-link/${encodeURIComponent(sessionId)}`);
  return unwrap<MeetingLinkResponse>(response.data);
};
