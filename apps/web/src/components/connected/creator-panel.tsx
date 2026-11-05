'use client';

import type { FormEvent } from 'react';
import { CampaignDetail, CampaignList, Label } from './shared';
import { statusLabel, type Campaign, type Category } from './types';
import styles from './connected-workspace.module.css';

export function CreatorPanel({
  categories,
  campaigns,
  selected,
  busy,
  onOpen,
  onAction,
}: {
  categories: Category[];
  campaigns: Campaign[];
  selected: Campaign | null;
  busy: boolean;
  onOpen: (campaign: Campaign) => void;
  onAction: (path: string, body: unknown, message: string, campaignId?: string) => Promise<boolean>;
}) {
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void onAction(
      'campaigns',
      {
        title: String(data.get('title')).trim(),
        categoryId: String(data.get('categoryId')),
        blurb: String(data.get('blurb')).trim(),
        storyMarkdown: String(data.get('storyMarkdown')).trim(),
        risksMarkdown: String(data.get('risksMarkdown')).trim(),
        location: String(data.get('location')).trim(),
        goalAmount: Number(data.get('goalAmount')),
        durationDays: Number(data.get('durationDays')),
      },
      'Đã tạo bản nháp trong PostgreSQL.',
    ).then((ok) => {
      if (ok) form.reset();
    });
  }
  return (
    <>
      <div className={styles.columns}>
        <div>
          <h3>Dự án của bạn</h3>
          <p className={styles.helper}>
            Một tài khoản có thể tạo nhiều dự án. Bản nháp chỉ hiện ở đây, chưa công khai.
          </p>
          <CampaignList
            campaigns={campaigns}
            selectedId={selected?.id}
            onOpen={onOpen}
            empty="Bạn chưa có dự án nào. Tạo bản nháp đầu tiên ở bên dưới."
          />
        </div>
        <div>
          {selected ? (
            <>
              <CampaignDetail campaign={selected} />
              <CreatorActions campaign={selected} busy={busy} onAction={onAction} />
            </>
          ) : (
            <div className={styles.prompt}>Chọn dự án để bổ sung gói ủng hộ, ảnh và gửi duyệt.</div>
          )}
        </div>
      </div>
      <details className={styles.createBox}>
        <summary>Tạo bản nháp mới</summary>
        <form onSubmit={create} className={styles.formGrid}>
          <label className={styles.wide}>
            <Label>Tên dự án</Label>
            <input
              name="title"
              minLength={4}
              maxLength={120}
              required
              placeholder="Ví dụ: Bếp Mây — hộp cơm cho người đi làm"
            />
          </label>
          <label>
            <Label>Lĩnh vực</Label>
            <select name="categoryId" required defaultValue="">
              <option value="" disabled>
                Chọn lĩnh vực
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Label>Địa điểm</Label>
            <input name="location" maxLength={120} required placeholder="Ví dụ: Đà Nẵng" />
          </label>
          <label className={styles.wide}>
            <Label>Mô tả ngắn</Label>
            <input
              name="blurb"
              maxLength={220}
              required
              placeholder="Nói rõ dự án làm gì và dành cho ai"
            />
          </label>
          <label className={styles.wide}>
            <Label>Kế hoạch thực hiện</Label>
            <textarea
              name="storyMarkdown"
              rows={5}
              required
              placeholder="Nhóm sẽ làm bản mẫu, thử với ai và giao sản phẩm như thế nào?"
            />
          </label>
          <label className={styles.wide}>
            <Label>Rủi ro và cách xử lý</Label>
            <textarea
              name="risksMarkdown"
              rows={3}
              required
              placeholder="Nêu khó khăn về sản xuất, lịch giao hoặc chi phí"
            />
          </label>
          <label>
            <Label>Mục tiêu (đồng)</Label>
            <input
              name="goalAmount"
              type="number"
              min={1000}
              step={1000}
              required
              defaultValue={50000000}
            />
          </label>
          <label>
            <Label>Số ngày gọi vốn (15–60)</Label>
            <input name="durationDays" type="number" min={15} max={60} required defaultValue={30} />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={busy}>
            Lưu bản nháp
          </button>
        </form>
      </details>
    </>
  );
}

function CreatorActions({
  campaign,
  busy,
  onAction,
}: {
  campaign: Campaign;
  busy: boolean;
  onAction: (path: string, body: unknown, message: string, campaignId?: string) => Promise<boolean>;
}) {
  const draft = campaign.status === 'DRAFT';
  const ready = Boolean(
    campaign.storyMarkdown?.trim() && campaign.media?.length && campaign.rewardTiers?.length,
  );
  function reward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void onAction(
      `campaigns/${campaign.id}/rewards`,
      {
        title: String(data.get('title')).trim(),
        description: String(data.get('description')).trim(),
        amount: Number(data.get('amount')),
        estimatedDelivery: String(data.get('estimatedDelivery')),
        requiresShipping: data.get('requiresShipping') === 'on',
        items: [],
      },
      'Đã thêm gói ủng hộ.',
      campaign.id,
    ).then((ok) => {
      if (ok) form.reset();
    });
  }
  function image(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void onAction(
      `campaigns/${campaign.id}/media`,
      {
        mediaType: 'IMAGE',
        url: String(data.get('url')).trim(),
        altText: String(data.get('altText')).trim(),
      },
      'Đã thêm ảnh vào hồ sơ.',
      campaign.id,
    ).then((ok) => {
      if (ok) form.reset();
    });
  }
  function shipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void onAction(
      `campaigns/${campaign.id}/shipping-options`,
      {
        name: String(data.get('name')).trim(),
        provinceCode: 'ALL',
        feeAmount: Number(data.get('feeAmount')),
        estimatedDaysMin: Number(data.get('estimatedDaysMin')),
        estimatedDaysMax: Number(data.get('estimatedDaysMax')),
      },
      'Đã thêm cách giao quà.',
      campaign.id,
    ).then((ok) => {
      if (ok) form.reset();
    });
  }
  return (
    <div className={styles.actionBox}>
      <h4>Việc tiếp theo của chủ dự án</h4>
      {draft && (
        <>
          <p className={styles.helper}>
            Trước khi gửi duyệt, hồ sơ cần câu chuyện, ít nhất một ảnh và một gói ủng hộ.
          </p>
          <ul className={styles.checklist}>
            <li>{campaign.storyMarkdown?.trim() ? '✓' : '○'} Kế hoạch dự án</li>
            <li>{campaign.media?.length ? '✓' : '○'} Ảnh minh họa</li>
            <li>{campaign.rewardTiers?.length ? '✓' : '○'} Gói ủng hộ</li>
          </ul>
          <details>
            <summary>Thêm ảnh dự án</summary>
            <form onSubmit={image} className={styles.formStack}>
              <label>
                <Label>Đường dẫn ảnh (https://)</Label>
                <input name="url" type="url" required placeholder="https://..." />
              </label>
              <label>
                <Label>Mô tả ảnh cho người đọc màn hình</Label>
                <input name="altText" required maxLength={240} />
              </label>
              <button className={styles.secondaryButton} disabled={busy}>
                Lưu ảnh
              </button>
            </form>
            {campaign.title.toLowerCase().includes('bếp mây') && (
              <button
                type="button"
                className={styles.textButton}
                disabled={busy}
                onClick={() =>
                  void onAction(
                    `campaigns/${campaign.id}/media`,
                    {
                      mediaType: 'IMAGE',
                      url: '/images/campaigns/bep-may-minh-hoa-v1.webp',
                      altText: 'Minh họa dự án Bếp Mây trong bộ ảnh mẫu của Góp',
                    },
                    'Đã dùng ảnh minh họa có sẵn.',
                    campaign.id,
                  )
                }
              >
                Dùng ảnh Bếp Mây có sẵn
              </button>
            )}
          </details>
          <details>
            <summary>Thêm gói ủng hộ</summary>
            <form onSubmit={reward} className={styles.formStack}>
              <label>
                <Label>Tên gói</Label>
                <input
                  name="title"
                  required
                  maxLength={120}
                  placeholder="Ví dụ: Gửi lời động viên"
                />
              </label>
              <label>
                <Label>Người ủng hộ nhận gì?</Label>
                <textarea name="description" rows={2} required />
              </label>
              <label>
                <Label>Giá gói (đồng)</Label>
                <input name="amount" type="number" min={1} required defaultValue={150000} />
              </label>
              <label>
                <Label>Ngày dự kiến giao</Label>
                <input name="estimatedDelivery" type="date" required />
              </label>
              <label className={styles.checkInput}>
                <input name="requiresShipping" type="checkbox" /> Cần địa chỉ nhận quà
              </label>
              <button className={styles.secondaryButton} disabled={busy}>
                Lưu gói ủng hộ
              </button>
            </form>
          </details>
          <details>
            <summary>Thêm cách giao quà nếu gói cần vận chuyển</summary>
            <form onSubmit={shipping} className={styles.formStack}>
              <label>
                <Label>Tên cách giao</Label>
                <input name="name" required defaultValue="Giao hàng tiêu chuẩn toàn quốc" />
              </label>
              <label>
                <Label>Phí giao (đồng)</Label>
                <input name="feeAmount" type="number" min={0} required defaultValue={35000} />
              </label>
              <label>
                <Label>Ít nhất (ngày)</Label>
                <input name="estimatedDaysMin" type="number" min={1} required defaultValue={2} />
              </label>
              <label>
                <Label>Nhiều nhất (ngày)</Label>
                <input name="estimatedDaysMax" type="number" min={1} required defaultValue={5} />
              </label>
              <button className={styles.secondaryButton} disabled={busy}>
                Lưu cách giao
              </button>
            </form>
          </details>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={busy || !ready}
            onClick={() =>
              void onAction(
                `campaigns/${campaign.id}/submit`,
                {},
                'Hồ sơ đã vào hàng chờ duyệt.',
                campaign.id,
              )
            }
          >
            Gửi quản trị viên duyệt
          </button>
        </>
      )}
      {campaign.status === 'IN_REVIEW' && (
        <p className={styles.helper}>
          Hồ sơ đang chờ quản trị viên xem. Bạn có thể đổi sang tài khoản quản trị trong menu bên
          trái để kiểm tra hàng chờ.
        </p>
      )}
      {campaign.status === 'PRE_LAUNCH' && (
        <>
          <p className={styles.helper}>
            Hồ sơ đã được duyệt. Chiến dịch chỉ công khai nhận cam kết sau khi bạn mở gọi vốn.
          </p>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={busy}
            onClick={() =>
              void onAction(
                `campaigns/${campaign.id}/launch`,
                {},
                'Chiến dịch đã mở gọi vốn.',
                campaign.id,
              )
            }
          >
            Mở gọi vốn
          </button>
        </>
      )}
      {campaign.status === 'LIVE' && (
        <>
          <p className={styles.helper}>
            Chiến dịch đang nhận cam kết. Bạn có thể giao cho thành viên đăng cập nhật tiến độ.
          </p>
          <InviteMember campaignId={campaign.id} busy={busy} onAction={onAction} />
        </>
      )}
      {!!campaign.statusHistory?.length && (
        <div className={styles.timeline}>
          <h4>Lịch sử hồ sơ</h4>
          <ol>
            {campaign.statusHistory.map((item) => (
              <li key={item.id}>
                <strong>{statusLabel[item.toStatus] ?? item.toStatus}</strong>
                <time dateTime={item.changedAt}>
                  {new Date(item.changedAt).toLocaleString('vi-VN')}
                </time>
                <small>
                  {item.changer?.displayName ?? 'Hệ thống'}
                  {item.reason ? ` — ${item.reason}` : ''}
                </small>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function InviteMember({
  campaignId,
  busy,
  onAction,
}: {
  campaignId: string;
  busy: boolean;
  onAction: (path: string, body: unknown, message: string, campaignId?: string) => Promise<boolean>;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void onAction(
      `campaigns/${campaignId}/members`,
      {
        email: String(data.get('email')),
        role: 'COLLABORATOR',
        canPostUpdates: true,
        canReplyComments: true,
      },
      'Đã thêm cộng tác viên vào chiến dịch.',
      campaignId,
    ).then((ok) => {
      if (ok) form.reset();
    });
  }
  return (
    <details>
      <summary>Mời cộng tác viên đã có tài khoản</summary>
      <form onSubmit={submit} className={styles.formStack}>
        <label>
          <Label>Email cộng tác viên</Label>
          <input type="email" name="email" required placeholder="ten@example.com" />
        </label>
        <button className={styles.secondaryButton} disabled={busy}>
          Thêm vào nhóm
        </button>
      </form>
    </details>
  );
}
