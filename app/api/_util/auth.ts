export function getBasicAuthUser(authHeader?: string | null): string | undefined {
  if (!authHeader?.startsWith('Basic ')) return;
  try {
    const b64 = authHeader.slice(6);
    const [u] = Buffer.from(b64, 'base64').toString('utf8').split(':', 2);
    return u || undefined;
  } catch {
    return;
  }
}
