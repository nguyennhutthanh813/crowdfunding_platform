export async function connectedRequest<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/connected/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message;
    throw new Error(
      typeof message === 'string' ? message : 'Không tải được dữ liệu. Vui lòng thử lại.',
    );
  }
  return data as T;
}
