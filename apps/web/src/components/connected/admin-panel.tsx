'use client';

import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Label, readableStory } from './shared';
import { money, type ReviewItem } from './types';
import styles from './connected-workspace.module.css';

export function AdminPanel({
  queue,
  selected,
  busy,
  onSelect,
  onAction,
}: {
  queue: ReviewItem[];
  selected: ReviewItem | null;
  busy: boolean;
  onSelect: (item: ReviewItem) => void;
  onAction: (path: string, body: unknown, message: string) => Promise<boolean>;
}) {
  const [decision, setDecision] = useState('APPROVED');
  function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const decision = String(data.get('decision'));
    const feedback = String(data.get('feedback')).trim();
    if (decision !== 'APPROVED' && !feedback) return;
    void onAction(
      `admin/campaigns/${selected.id}/review`,
      { decision, feedback },
      decision === 'APPROVED'
        ? 'Đã duyệt hồ sơ; chủ dự án có thể mở gọi vốn.'
        : 'Đã gửi phản hồi cho chủ dự án.',
    );
  }
  return (
    <div className={styles.columns}>
      <div>
        <h3>Hồ sơ cần xem</h3>
        <p className={styles.helper}>
          Chỉ hồ sơ đang chờ duyệt mới có nút quyết định. Hồ sơ đã yêu cầu sửa vẫn hiện để đối
          chiếu.
        </p>
        {queue.length ? (
          <div className={styles.list}>
            {queue.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`${styles.listItem} ${selected?.id === item.id ? styles.chosen : ''}`}
                onClick={() => onSelect(item)}
              >
                <span className={styles.itemCategory}>
                  {item.category}
                  <span>{item.status === 'PENDING' ? 'Chờ duyệt' : 'Cần sửa'}</span>
                </span>
                <strong>{item.title}</strong>
                <small>{item.creator}</small>
                <span className={styles.itemBottom}>
                  {money(item.goalAmount)} <ArrowRight size={16} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Hiện không có hồ sơ nào trong hàng chờ.</p>
        )}
      </div>
      <div>
        {selected ? (
          <article className={styles.reviewDetail}>
            <h3>{selected.title}</h3>
            <p>Chủ dự án: {selected.creator}</p>
            <p>Mục tiêu: {money(selected.goalAmount)}</p>
            <h4>Kế hoạch</h4>
            <p className={styles.prose}>{readableStory(selected.story || 'Chưa có nội dung')}</p>
            <h4>Rủi ro</h4>
            <p className={styles.prose}>{readableStory(selected.risks || 'Chưa có nội dung')}</p>
            <h4>Kiểm tra hồ sơ</h4>
            <ul className={styles.checklist}>
              {selected.checks.map((check) => (
                <li key={check.label}>
                  {check.status === 'PASS' ? '✓' : '○'} {check.label}: {check.detail}
                </li>
              ))}
            </ul>
            {selected.status === 'PENDING' ? (
              <form onSubmit={decide} className={styles.formStack}>
                <label>
                  <Label>Quyết định</Label>
                  <select
                    name="decision"
                    value={decision}
                    onChange={(event) => setDecision(event.target.value)}
                    required
                  >
                    <option value="APPROVED">Duyệt hồ sơ</option>
                    <option value="CHANGES_REQUESTED">Yêu cầu bổ sung</option>
                    <option value="REJECTED">Từ chối</option>
                  </select>
                </label>
                <label>
                  <Label>Ghi chú cho chủ dự án (bắt buộc nếu yêu cầu sửa/từ chối)</Label>
                  <textarea
                    name="feedback"
                    rows={3}
                    required={decision !== 'APPROVED'}
                    placeholder="Ghi rõ điểm cần bổ sung để nhóm biết cách sửa"
                  />
                </label>
                <button type="submit" className={styles.primaryButton} disabled={busy}>
                  Gửi quyết định
                </button>
              </form>
            ) : (
              <p className={styles.helper}>Hồ sơ này đã có phản hồi và chưa được gửi duyệt lại.</p>
            )}
          </article>
        ) : (
          <div className={styles.prompt}>
            Chọn một hồ sơ để xem nội dung và kiểm tra trước khi quyết định.
          </div>
        )}
      </div>
    </div>
  );
}
