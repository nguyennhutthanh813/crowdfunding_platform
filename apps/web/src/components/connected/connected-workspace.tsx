'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, LogOut, RefreshCw } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { connectedRequest } from './request';
import { AdminPanel } from './admin-panel';
import { BackerPanel } from './backer-panel';
import { CollaboratorPanel } from './collaborator-panel';
import { CreatorPanel } from './creator-panel';
import { DiscussionPanel } from './discussion-panel';
import { NotificationPanel } from './notification-panel';
import { CampaignBrowser, Label } from './shared';
import { type Campaign, type Category, type Pledge, type ReviewItem, type User } from './types';
import styles from './connected-workspace.module.css';

type View = 'public' | 'creator' | 'admin' | 'backer' | 'collaborator';
type List<T> = { data: T[] };

const views: { key: View; label: string; role?: string; summary: string }[] = [
  { key: 'public', label: 'Khám phá', summary: 'Ai cũng xem được chiến dịch đang mở.' },
  {
    key: 'creator',
    label: 'Chủ dự án',
    role: 'CREATOR',
    summary: 'Lập hồ sơ, gửi duyệt và mở gọi vốn.',
  },
  {
    key: 'admin',
    label: 'Quản trị',
    role: 'ADMIN',
    summary: 'Kiểm tra hồ sơ và trả lời chủ dự án.',
  },
  {
    key: 'backer',
    label: 'Người ủng hộ',
    role: 'BACKER',
    summary: 'Chọn gói, xem số tiền và cam kết.',
  },
  {
    key: 'collaborator',
    label: 'Cộng tác viên',
    role: 'COLLABORATOR',
    summary: 'Cập nhật tiến độ trong quyền được giao.',
  },
];

const quickAccounts = [
  { id: 'creator', label: 'Chủ dự án Linh' },
  { id: 'admin', label: 'Quản trị viên An' },
  { id: 'backer', label: 'Người ủng hộ Minh Anh' },
  { id: 'collaborator', label: 'Cộng tác viên Gia Huy' },
];

export function ConnectedWorkspace() {
  const [view, setView] = useState<View>('public');
  const [user, setUser] = useState<User | null>(null);
  const [demoAccounts, setDemoAccounts] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [publicCampaigns, setPublicCampaigns] = useState<Campaign[]>([]);
  const [publicLoaded, setPublicLoaded] = useState(false);
  const [mine, setMine] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function reloadPublic() {
    const [campaigns, categoryList] = await Promise.all([
      connectedRequest<List<Campaign>>('campaigns'),
      connectedRequest<Category[]>('campaigns/categories'),
    ]);
    setPublicCampaigns(campaigns.data);
    setCategories(categoryList);
    setPublicLoaded(true);
  }

  async function reloadRole(nextView = view) {
    if (nextView === 'creator') setMine(await connectedRequest<Campaign[]>('campaigns/creator/my'));
    if (nextView === 'collaborator')
      setMine(await connectedRequest<Campaign[]>('campaigns/collaborator/my'));
    if (nextView === 'backer')
      setPledges((await connectedRequest<List<Pledge>>('pledges/me')).data);
    if (nextView === 'admin')
      setQueue(await connectedRequest<ReviewItem[]>('admin/campaigns/review-queue'));
  }

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      connectedRequest<{ user: User | null; demoAccounts: boolean }>('session'),
      connectedRequest<List<Campaign>>('campaigns'),
      connectedRequest<Category[]>('campaigns/categories'),
    ])
      .then(([session, campaigns, categoryList]) => {
        if (!active) return;
        if (session.status === 'fulfilled') {
          setUser(session.value.user);
          setDemoAccounts(Boolean(session.value.demoAccounts));
        }
        if (campaigns.status === 'fulfilled') {
          setPublicCampaigns(campaigns.value.data);
          setPublicLoaded(true);
        }
        if (categoryList.status === 'fulfilled') setCategories(categoryList.value);
        const failed = [session, campaigns, categoryList].find((result) => result.status === 'rejected');
        if (failed?.status === 'rejected') {
          setError(failed.reason instanceof Error ? failed.reason.message : 'Không tải được dữ liệu.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const role = views.find((item) => item.key === view)?.role;
    if (!role || !user?.roles.includes(role)) return;
    let active = true;
    const job =
      view === 'creator'
        ? connectedRequest<Campaign[]>('campaigns/creator/my')
        : view === 'collaborator'
          ? connectedRequest<Campaign[]>('campaigns/collaborator/my')
          : view === 'backer'
            ? connectedRequest<List<Pledge>>('pledges/me')
            : connectedRequest<ReviewItem[]>('admin/campaigns/review-queue');
    job
      .then((result) => {
        if (!active) return;
        if (view === 'creator' || view === 'collaborator') setMine(result as Campaign[]);
        if (view === 'backer') setPledges((result as List<Pledge>).data);
        if (view === 'admin') setQueue(result as ReviewItem[]);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [view, user?.id, user?.roles]);

  function changeView(next: View, account = user) {
    setView(next);
    const role = views.find((item) => item.key === next)?.role;
    setLoading(Boolean(role && account?.roles.includes(role)));
    setSelected(null);
    setSelectedReview(null);
    setError('');
    setNotice('');
  }

  async function signIn(body: { email?: string; password?: string; demoAccount?: string }) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const session = await connectedRequest<{ user: User }>('session', 'POST', body);
      setUser(session.user);
      const role = session.user.roles.includes('ADMIN')
        ? 'admin'
        : session.user.roles.includes('CREATOR')
          ? 'creator'
          : session.user.roles.includes('COLLABORATOR')
            ? 'collaborator'
            : 'backer';
      changeView(role, session.user);
      setNotice(`Đã đăng nhập tài khoản ${session.user.displayName}.`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await connectedRequest('session', 'DELETE');
      setUser(null);
      setMine([]);
      setPledges([]);
      setQueue([]);
      changeView('public');
      setNotice('Đã đăng xuất tài khoản dùng chung.');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openCampaign(campaign: Campaign) {
    setSelected(null);
    setSelectedReview(null);
    setError('');
    setLoading(true);
    try {
      const managed = view === 'creator' || view === 'collaborator';
      setSelected(
        await connectedRequest<Campaign>(`campaigns/${campaign.id}${managed ? '/manage' : ''}`),
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function openNotificationCampaign(slug: string) {
    changeView('public');
    setLoading(true);
    try {
      setSelected(await connectedRequest<Campaign>(`campaigns/${slug}`));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function act(path: string, body: unknown, message: string, campaignId?: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await connectedRequest<Campaign>(path, 'POST', body);
      setNotice(message);
      await Promise.all([reloadPublic(), reloadRole()]);
      if (campaignId || (result?.id && view === 'creator')) {
        const id = campaignId ?? result.id;
        setSelected(await connectedRequest<Campaign>(`campaigns/${id}/manage`));
      }
      if (view === 'admin') setSelectedReview(null);
      return true;
    } catch (reason) {
      setError((reason as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const currentView = views.find((item) => item.key === view);
  const requiredRole = currentView?.role;
  const allowed = !requiredRole || user?.roles.includes(requiredRole);
  const member = selected?.members?.find((item) => item.userId === user?.id);
  const discussion = selected ? (
    <DiscussionPanel
      key={`discussion-${selected.id}`}
      campaignId={selected.id}
      user={user}
      allowReply={member?.role !== 'COLLABORATOR' || member.canReplyComments}
    />
  ) : null;

  return (
    <div className={`${styles.root} ${styles[view]}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BrandLogo light={false} />
          <span className={styles.headerDivider} />
          <strong>Quy trình chiến dịch</strong>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={17} /> Về bản trải nghiệm
          </Link>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.intro}>
          <div>
            <p className={styles.context}>Bản thử nghiệm dùng chung dữ liệu</p>
            <h1>Theo dõi chiến dịch qua từng vai trò</h1>
            <p>
              Xem Chủ dự án tạo hồ sơ, Quản trị viên duyệt rồi Người ủng hộ cam kết. Khi được mời,
              Cộng tác viên có thể cập nhật tiến độ của chính chiến dịch đó.
            </p>
          </div>
          <div className={styles.flow} aria-label="Quy trình chính">
            <strong className={styles.flowTitle}>Các bước chính</strong>
            <ol>
              <li><b>1</b><span>Chủ dự án tạo và gửi hồ sơ</span></li>
              <li><b>2</b><span>Quản trị viên xét duyệt</span></li>
              <li><b>3</b><span>Chủ dự án mở gọi vốn</span></li>
              <li><b>4</b><span>Người ủng hộ tạo cam kết</span></li>
            </ol>
            <p className={styles.flowNote}>Cộng tác viên tham gia sau khi được Chủ dự án mời.</p>
          </div>
        </section>

        <div className={styles.noticeLine}>
          Dữ liệu trong khu vực này lấy từ API NestJS và PostgreSQL. Cam kết chỉ ở trạng thái chờ
          thanh toán; trang không thu tiền.
        </div>

        <div className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}>Góc nhìn</div>
            <nav aria-label="Chọn vai trò" className={styles.nav}>
              {views.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => changeView(item.key)}
                  aria-pressed={view === item.key}
                  className={`${styles.navItem} ${view === item.key ? styles.active : ''}`}
                >
                  <span>{item.label}</span>
                  <small>{item.summary}</small>
                </button>
              ))}
            </nav>
            <div className={styles.accountBox}>
              {user ? (
                <>
                  <span>Đang đăng nhập</span>
                  <strong>{user.displayName}</strong>
                  <small>{user.email}</small>
                  <button
                    className={styles.textButton}
                    type="button"
                    disabled={busy}
                    onClick={() => void signOut()}
                  >
                    <LogOut size={15} /> Đổi tài khoản
                  </button>
                </>
              ) : (
                <>
                  <span>Chưa đăng nhập</span>
                  <small>Khám phá không cần tài khoản. Chọn vai trò khác để thử việc của họ.</small>
                </>
              )}
            </div>
          </aside>

          <section className={styles.main} aria-label="Nội dung theo vai trò">
            <div className={styles.mainHead}>
              <div>
                <p>{currentView?.summary}</p>
                <h2>{currentView?.label}</h2>
              </div>
              <button
                className={styles.refresh}
                type="button"
                disabled={busy || loading}
                onClick={() => {
                  setError('');
                  void (view === 'public' ? reloadPublic() : reloadRole()).catch((reason) =>
                    setError(reason.message),
                  );
                }}
              >
                <RefreshCw size={16} /> Tải lại
              </button>
            </div>
            {user && (
              <NotificationPanel
                key={user.id}
                userId={user.id}
                onOpenCampaign={openNotificationCampaign}
              />
            )}
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className={styles.success} role="status">
                <Check size={16} /> {notice}
              </div>
            )}
            {loading && (
              <p className={styles.loading} role="status">
                Đang đọc dữ liệu…
              </p>
            )}

            {!allowed && !loading && (
              <SignIn
                demoAccounts={demoAccounts}
                busy={busy}
                onSignIn={signIn}
                roleName={currentView?.label ?? ''}
                roleKey={view}
                currentUserName={user?.displayName}
              />
            )}

            {allowed && !loading && publicLoaded && view === 'public' && (
              <CampaignBrowser
                campaigns={publicCampaigns}
                selected={selected}
                onOpen={openCampaign}
                discussion={discussion}
              />
            )}

            {allowed && !loading && view === 'creator' && (
              <CreatorPanel
                categories={categories}
                campaigns={mine}
                selected={selected}
                busy={busy}
                onOpen={openCampaign}
                onAction={act}
                discussion={discussion}
              />
            )}

            {allowed && !loading && view === 'admin' && (
              <AdminPanel
                queue={queue}
                selected={selectedReview}
                busy={busy}
                onSelect={setSelectedReview}
                onAction={act}
              />
            )}

            {allowed && !loading && view === 'backer' && (
              <BackerPanel
                campaigns={publicCampaigns}
                pledges={pledges}
                selected={selected}
                busy={busy}
                onOpen={openCampaign}
                onAction={act}
                discussion={discussion}
              />
            )}

            {allowed && !loading && view === 'collaborator' && (
              <CollaboratorPanel
                campaigns={mine}
                selected={selected}
                busy={busy}
                userId={user?.id ?? ''}
                onOpen={openCampaign}
                onAction={act}
                discussion={discussion}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SignIn({
  demoAccounts,
  busy,
  onSignIn,
  roleName,
  roleKey,
  currentUserName,
}: {
  demoAccounts: boolean;
  busy: boolean;
  onSignIn: (body: { email?: string; password?: string; demoAccount?: string }) => Promise<void>;
  roleName: string;
  roleKey: View;
  currentUserName?: string;
}) {
  const quickAccount = quickAccounts.find((account) => account.id === roleKey);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSignIn({ email: String(data.get('email')), password: String(data.get('password')) });
  }
  return (
    <section className={styles.signIn}>
      <h3>Đăng nhập để xem phần {roleName.toLowerCase()}</h3>
      <p>
        {currentUserName
          ? `${currentUserName} chưa có quyền xem phần này. Đăng nhập bằng tài khoản phù hợp để tiếp tục.`
          : 'Đăng nhập để xem công việc và dữ liệu của vai trò bạn đã chọn.'}
      </p>
      {demoAccounts && quickAccount && (
        <div className={styles.quickAccounts}>
          <button
            type="button"
            className={styles.quickButton}
            disabled={busy}
            onClick={() => void onSignIn({ demoAccount: quickAccount.id })}
          >
            Đăng nhập nhanh: {quickAccount.label}
          </button>
        </div>
      )}
      <form onSubmit={submit} className={styles.formRow}>
        <label>
          <Label>Email</Label>
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          <Label>Mật khẩu</Label>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className={styles.primaryButton} disabled={busy}>
          Đăng nhập
        </button>
      </form>
    </section>
  );
}
