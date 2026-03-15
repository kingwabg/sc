export type JournalSectionPayload = {
  heading: string;
  content: string;
};

export type JournalHwpPayload = {
  title: string;
  author: string;
  facilityName: string;
  journalDate: string;
  startTime?: string;
  endTime?: string;
  programName?: string;
  highlights: string[];
  sections: JournalSectionPayload[];
  tableHeaders: string[];
  tableRows: string[][];
  notes?: string;
};

export type JournalAiDraftRequestPayload = {
  prompt: string;
  author: string;
  facilityName: string;
  journalDate: string;
  startTime?: string;
  endTime?: string;
  programName?: string;
  recordType?: string;
  target?: string;
  tags?: string;
  currentBody?: string;
};

export type JournalAiDraftResponsePayload = {
  reply: string;
  mode: "openai" | "fallback";
  draft: JournalHwpPayload;
};

export type JournalAiStatusPayload = {
  openAiConfigured: boolean;
  model: string;
};

const DEFAULT_API_BASE_URL = "http://localhost:8081";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text();
  return text.trim() || `API 요청에 실패했습니다. (${response.status})`;
}

export async function requestJournalAiDraft(
  payload: JournalAiDraftRequestPayload
): Promise<JournalAiDraftResponsePayload> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/documents/journal/ai-draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as JournalAiDraftResponsePayload;
}

export async function requestJournalAiStatus(): Promise<JournalAiStatusPayload> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/documents/journal/ai-status`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as JournalAiStatusPayload;
}

export async function requestJournalHwp(payload: JournalHwpPayload): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/documents/journal/hwp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return await response.blob();
}

export function getJournalApiBaseUrlLabel(): string {
  return getApiBaseUrl();
}
