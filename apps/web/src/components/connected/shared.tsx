import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { money, statusLabel, type Campaign } from './types';
import styles from './connected-workspace.module.css';

export function readableStory(raw: string) {
  return raw
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*]\s*/gm, '• ')
    .trim();
}

export function Label({ children }: { children: ReactNode }) {
  return <span className={styles.label}>{children}</span>;
}

export function CampaignList({
  campaigns,
  selectedId,
  onOpen,
  empty,
}: {
  campaigns: Campaign[];
  selectedId?: string;
  onOpen: (campaign: Campaign) => void;
  empty: string;
}) {
  if (!campaigns.length) return <p className={styles.empty}>{empty}</p>;
  return (
    <div className={styles.list}>
      {campaigns.map((campaign) => (
        <button
          type="button"
          key={campaign.id}
          onClick={() => onOpen(campaign)}
          aria-pressed={selectedId === campaign.id}
          className={`${styles.listItem} ${selectedId === campaign.id ? styles.chosen : ''}`}
        >
          <span className={styles.itemCategory}>
            {campaign.category?.name ?? 'Dự án'}
            <span>{statusLabel[campaign.status] ?? campaign.status}</span>
          </span>
          <strong>{campaign.title}</strong>
          <small>{campaign.blurb}</small>
          <span className={styles.itemBottom}>
            {money(campaign.goalAmount)} mục tiêu <ArrowRight size={16} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function CampaignDetail({
  campaign,
  showUpdates = true,
}: {
  campaign: Campaign;
  showUpdates?: boolean;
}) {
  const photo = campaign.media?.find((item) => item.mediaType === 'IMAGE');
  return (
    <article className={styles.detail}>
      {photo && (
        <div
          className={styles.photo}
          style={{ backgroundImage: `url(${photo.url})` }}
          role="img"
          aria-label={photo.altText || campaign.title}
        />
      )}
      <div className={styles.detailBody}>
        <div className={styles.detailMeta}>
          <span>{campaign.category?.name}</span>
          <span>{campaign.location}</span>
          <span>{statusLabel[campaign.status] ?? campaign.status}</span>
        </div>
        <h3>{campaign.title}</h3>
        <p>{campaign.blurb}</p>
        <dl className={styles.facts}>
          <div>
            <dt>Mục tiêu</dt>
            <dd>{money(campaign.goalAmount)}</dd>
          </div>
          <div>
            <dt>Thời gian</dt>
            <dd>{campaign.durationDays} ngày</dd>
          </div>
          <div>
            <dt>Chủ dự án</dt>
            <dd>{campaign.creator?.displayName ?? '—'}</dd>
          </div>
        </dl>
        {campaign.storyMarkdown && (
          <section>
            <h4>Câu chuyện</h4>
            <p className={styles.prose}>{readableStory(campaign.storyMarkdown)}</p>
          </section>
        )}
        {campaign.risksMarkdown && (
          <section>
            <h4>Rủi ro cần biết</h4>
            <p className={styles.prose}>{readableStory(campaign.risksMarkdown)}</p>
          </section>
        )}
        {!!campaign.rewardTiers?.length && (
          <section>
            <h4>Các gói ủng hộ</h4>
            <div className={styles.rewardList}>
              {campaign.rewardTiers.map((reward) => (
                <div key={reward.id}>
                  <strong>{reward.title}</strong>
                  <span>{money(reward.amount)}</span>
                  <small>{reward.description}</small>
                </div>
              ))}
            </div>
          </section>
        )}
        {showUpdates && !!campaign.updates?.length && (
          <section>
            <h4>Tiến độ mới nhất</h4>
            <div className={styles.updateList}>
              {campaign.updates.map((item) => (
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
          </section>
        )}
      </div>
    </article>
  );
}

export function CampaignBrowser({
  campaigns,
  selected,
  onOpen,
  discussion,
}: {
  campaigns: Campaign[];
  selected: Campaign | null;
  onOpen: (campaign: Campaign) => void;
  discussion?: ReactNode;
}) {
  return (
    <div className={styles.columns}>
      <div>
        <h3>Chiến dịch đang công khai</h3>
        <CampaignList
          campaigns={campaigns}
          selectedId={selected?.id}
          onOpen={onOpen}
          empty="Chưa có chiến dịch công khai trong PostgreSQL."
        />
      </div>
      <div>
        {selected ? (
          <>
            <CampaignDetail campaign={selected} />
            {discussion}
          </>
        ) : (
          <div className={styles.prompt}>
            Chọn một chiến dịch để xem câu chuyện, gói ủng hộ và người thực hiện.
          </div>
        )}
      </div>
    </div>
  );
}
