export function parseCookies(header: string | null | undefined): Record<string, string> {
  if (!header?.trim()) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const [rawName, ...rawValue] = pair.split("=");
    const name = rawName?.trim();
    if (!name) {
      continue;
    }
    const serializedValue = rawValue.join("=").trim();
    try {
      cookies[name] = decodeURIComponent(serializedValue);
    } catch {
      cookies[name] = serializedValue;
    }
  }

  return cookies;
}
