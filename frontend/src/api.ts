export type ScriptStyle = "screenplay" | "short_drama" | "audio_drama";

export type ChapterInfo = {
  index: number;
  title: string;
  preview: string;
};

export type ChapterValidationResponse = {
  chapter_count: number;
  valid: boolean;
  chapters: ChapterInfo[];
  message: string;
};

const API_BASE_URL = "http://127.0.0.1:8000";

export async function validateChapters(payload: {
  title: string;
  text: string;
  style: ScriptStyle;
}): Promise<ChapterValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chapters/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("章节校验失败，请检查后端服务是否正常运行");
  }

  return response.json() as Promise<ChapterValidationResponse>;
}
