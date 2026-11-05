'use client';

import type { FormEvent } from 'react';
import { CampaignDetail, CampaignList, Label, readableStory } from './shared';
import type { Campaign } from './types';
import styles from './connected-workspace.module.css';

export function CollaboratorPanel({
  campaigns,
  selected,
  busy,
  userId,
  onOpen,
  onAction,
}: {
  campaigns: Campaign[];
  selected: Campaign | null;
  busy: boolean;
  userId: string;
  onOpen: (campaign: Campaign) => void;
  onAction: (path: string, body: unknown, message: string, campaignId?: string) => Promise<boolean>;
}) {
  const member = selected?.members?.find((item) => item.userId === userId);
  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    void onAction(
      `campaigns/${selected.id}/updates`,
      { title: String(data.get('title')).trim(), body: String(data.get('body')).trim() },
      'Đã đăng tiến độ và người ủng hộ sẽ thấy bản cập nhật.',
      selected.id,
    ).then((ok) => {
      if (ok) form.reset();
    });
  }
  return (
    <div className={styles.columns}>
      <div>
        <h3>Chiến dịch được giao</h3>
        <p className={styles.helper}>
          Quyền cộng tác gắn với từng chiến dịch, không tự có trên mọi dự án.
        </p>
        <CampaignList
          campaigns={campaigns}
          selectedId={selected?.id}
          onOpen={onOpen}
          empty="Tài khoản này chưa được thêm vào chiến dịch nào."
        />
      </div>
      <div>
        {selected ? (
          <>
            <CampaignDetail campaign={selected} showUpdates={false} />
            <section className={styles.actionBox}>
              <h4>Nhật ký tiến độ</h4>
              {selected.updates?.length ? (
                <div className={styles.updateList}>
                  {selected.updates.map((item) => (
                    <article key={item.id}>
                      <strong>{item.title}</strong>
                      <small>
                        {item.author?.displayName ?? 'Nhóm dự án'} ·{' '}
                        {new Date(item.publishedAt).toLocaleDateString('vi-VN')}
                      </small>
                      <p>{readableStory(item.bodyMarkdown)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Chưa có bản cập nhật nào.</p>
              )}
              {selected.status === 'LIVE' && member?.canPostUpdates ? (
                <form onSubmit={publish} className={styles.formStack}>
                  <label>
                    <Label>Tiêu đề cập nhật</Label>
                    <input
                      name="title"
                      maxLength={100}
                      required
                      placeholder="Ví dụ: Đã hoàn thành bản mẫu đầu tiên"
                    />
                  </label>
                  <label>
                    <Label>Nội dung thực hiện</Label>
                    <textarea name="body" rows={4} maxLength={2000} required />
                  </label>
                  <button className={styles.primaryButton} disabled={busy}>
                    Đăng cập nhật
                  </button>
                </form>
              ) : (
                <p className={styles.helper}>
                  Chưa thể đăng: chiến dịch chưa mở gọi vốn hoặc bạn chưa được cấp quyền đăng tiến
                  độ.
                </p>
              )}
            </section>
          </>
        ) : (
          <div className={styles.prompt}>Chọn chiến dịch để xem tiến độ và quyền của bạn.</div>
        )}
      </div>
    </div>
  );
}
