import {
  authorizedBackendRequest,
  backendError,
  backendRequest,
  sameOriginWrite,
} from '@/lib/connected/backend';

export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };
const id = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
const allowed: Record<string, RegExp[]> = {
  GET: [
    /^campaigns$/,
    /^campaigns\/categories$/,
    /^campaigns\/creator\/my$/,
    /^campaigns\/collaborator\/my$/,
    new RegExp(`^campaigns\/(${id}|${slug})$`),
    new RegExp(`^campaigns\/${id}\/manage$`),
    new RegExp(`^campaigns\/${id}\/updates$`),
    /^pledges\/me$/,
    /^admin\/campaigns\/review-queue$/,
    new RegExp(`^admin\/campaigns\/${id}\/review-detail$`),
  ],
  POST: [
    /^campaigns$/,
    /^pledges$/,
    new RegExp(
      `^campaigns\/${id}\/(rewards|media|shipping-options|submit|launch|updates|members)$`,
    ),
    new RegExp(`^admin\/campaigns\/${id}\/review$`),
  ],
};

async function forward(request: Request, context: Context, method: 'GET' | 'POST') {
  const path = (await context.params).path.join('/');
  if (!allowed[method].some((pattern) => pattern.test(path)))
    return backendError(404, 'Đường dẫn chưa được nối với backend.');
  if (method === 'POST' && !sameOriginWrite(request))
    return backendError(403, 'Yêu cầu không cùng nguồn với trang web.');
  const privatePath =
    (path === 'campaigns' && method === 'POST') ||
    path.startsWith('campaigns/creator/') ||
    path.startsWith('campaigns/collaborator/') ||
    path.endsWith('/manage') ||
    path.startsWith('pledges') ||
    path.startsWith('admin/') ||
    (method === 'POST' && path !== 'campaigns');
  let body: unknown;
  if (method === 'POST') {
    if (!request.headers.get('content-type')?.includes('application/json'))
      return backendError(415, 'Cần gửi dữ liệu JSON.');
    const raw = await request.text();
    if (raw.length > 64_000) return backendError(413, 'Nội dung vượt quá 64 KB.');
    try {
      body = JSON.parse(raw);
    } catch {
      return backendError(400, 'Dữ liệu JSON không hợp lệ.');
    }
  }
  const query = method === 'GET' ? new URL(request.url).search : '';
  return privatePath
    ? authorizedBackendRequest(`${path}${query}`, method, body)
    : backendRequest(`${path}${query}`, method, undefined, body);
}

export async function GET(request: Request, context: Context) {
  return forward(request, context, 'GET');
}
export async function POST(request: Request, context: Context) {
  return forward(request, context, 'POST');
}
