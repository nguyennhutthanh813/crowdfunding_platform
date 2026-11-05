import type { Metadata } from 'next';
import { ConnectedWorkspace } from '@/components/connected/connected-workspace';

export const metadata: Metadata = {
  title: 'Dữ liệu dùng chung',
  description:
    'Theo dõi một chiến dịch từ chủ dự án, quản trị viên, người ủng hộ đến cộng tác viên trên dữ liệu PostgreSQL.',
};

export default function ConnectedPage() {
  return <ConnectedWorkspace />;
}
