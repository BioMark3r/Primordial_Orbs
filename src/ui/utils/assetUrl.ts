function normalizeBase(baseUrl: string): string {
  if (!baseUrl) return "/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

export function assetUrl(path: string): string {
  const base = normalizeBase(import.meta.env.BASE_URL ?? "/");
  const normalizedPath = normalizePath(path);
  return `${base}${normalizedPath}`;
}

