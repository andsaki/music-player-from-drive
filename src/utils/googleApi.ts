export class GoogleApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
  }
}

const buildUrl = (url: string, params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) {
    return url;
  }

  const nextUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      nextUrl.searchParams.set(key, String(value));
    }
  });

  return nextUrl.toString();
};

const request = async (
  url: string,
  accessToken: string,
  init?: RequestInit,
  params?: Record<string, string | number | boolean | undefined>,
) => {
  const response = await fetch(buildUrl(url, params), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new GoogleApiError(`Google API request failed: ${response.status}`, response.status);
  }

  return response;
};

export const googleApiJson = async <T>(
  url: string,
  accessToken: string,
  init?: RequestInit,
  params?: Record<string, string | number | boolean | undefined>,
) => {
  const response = await request(url, accessToken, init, params);
  return (await response.json()) as T;
};

export const googleApiText = async (
  url: string,
  accessToken: string,
  init?: RequestInit,
  params?: Record<string, string | number | boolean | undefined>,
) => {
  const response = await request(url, accessToken, init, params);
  return response.text();
};

export const googleApiBlob = async (
  url: string,
  accessToken: string,
  init?: RequestInit,
  params?: Record<string, string | number | boolean | undefined>,
) => {
  const response = await request(url, accessToken, init, params);
  return response.blob();
};
