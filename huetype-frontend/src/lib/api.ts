import { createClient } from "./supabase-browser";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export type FontType = "illustration" | "duo" | "tri";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "draft" | "building" | "ready" | "error";
  font_type: FontType;
  palette: string[];
  created_at: string;
  updated_at: string;
  glyph_count?: number;
};

export type Glyph = {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  codepoint: string;
  svg_storage_path: string;
  svg_url?: string | null;
  layer_count: number;
  upload_order: number;
  created_at: string;
};

export type FontJob = {
  id: string;
  project_id: string;
  user_id: string;
  status: "queued" | "processing" | "complete" | "failed";
  color_format: string;
  error_message: string | null;
  font_storage_path: string | null;
  ttf_storage_path: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ProjectDetail = Project & {
  glyphs: Glyph[];
  latest_job: FontJob | null;
};

async function getToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Not authenticated");
  return data.session.access_token;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listProjects: () => apiFetch<Project[]>("/projects"),

  getProject: (id: string) => apiFetch<ProjectDetail>(`/projects/${id}`),

  createProject: (params: {
    name: string;
    description: string;
    font_type: FontType;
    palette: string[];
  }) =>
    apiFetch<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  updateProject: (
    id: string,
    params: {
      name: string;
      description: string;
      font_type: FontType;
      palette: string[];
    },
  ) =>
    apiFetch<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    }),

  deleteProject: (id: string) =>
    apiFetch<void>(`/projects/${id}`, { method: "DELETE" }),

  uploadGlyph: (projectId: string, file: File, name: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name);
    return apiFetch<Glyph>(`/projects/${projectId}/glyphs`, {
      method: "POST",
      body: fd,
    });
  },

  updateGlyph: (
    projectId: string,
    glyphId: string,
    body: { name?: string; codepoint?: string },
  ) =>
    apiFetch<Glyph>(`/projects/${projectId}/glyphs/${glyphId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  replaceGlyphSvg: (projectId: string, glyphId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<Glyph>(`/projects/${projectId}/glyphs/${glyphId}/svg`, {
      method: "PUT",
      body: fd,
    });
  },

  deleteGlyph: (projectId: string, glyphId: string) =>
    apiFetch<void>(`/projects/${projectId}/glyphs/${glyphId}`, {
      method: "DELETE",
    }),

  createJob: (projectId: string, color_format = "glyf_colr_1") =>
    apiFetch<{ job_id: string; status: string }>(
      `/projects/${projectId}/jobs`,
      {
        method: "POST",
        body: JSON.stringify({ color_format }),
      },
    ),

  getJob: (projectId: string, jobId: string) =>
    apiFetch<FontJob>(`/projects/${projectId}/jobs/${jobId}`),

  getDownloadUrl: (projectId: string, jobId: string, fmt: "ttf" | "woff2") =>
    apiFetch<{ url: string; format: string; expires_in: number }>(
      `/projects/${projectId}/jobs/${jobId}/download?fmt=${fmt}`,
    ),
};
