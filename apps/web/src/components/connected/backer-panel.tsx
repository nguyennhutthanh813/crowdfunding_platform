'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { CampaignDetail, CampaignList, Label } from './shared';
import { money, statusLabel, type Campaign, type Pledge } from './types';
import styles from './connected-workspace.module.css';

export function BackerPanel({
  campaigns,
  pledges,
  selected,
  busy,
  onOpen,
  onAction,
  discussion,
}: {
  campaigns: Campaign[];
  pledges: Pledge[];
  selected: Campaign | null;
  busy: boolean;
  onOpen: (campaign: Campaign) => void;
  onAction: (path: string, body: unknown, message: string) => Promise<boolean>;
  discussion?: ReactNode;
}) {
  return (
    <>
      <div className={styles.columns}>
        <div>
          <h3>Chọn chiến dịch</h3>
          <CampaignList
            campaigns={campaigns.filter((campaign) => campaign.status === 'LIVE')}
            selectedId={selected?.id}
            onOpen={onOpen}
            empty="Chưa có chiến dịch nào đang nhận cam kết."
          />
        </div>
        <div>
          {selected ? (
            <>
              <CampaignDetail campaign={selected} />
              <PledgeForm
                key={selected.id}
                campaign={selected}
                busy={busy}
                alreadyPledged={pledges.some((pledge) => pledge.campaign.slug === selected.slug)}
                onAction={onAction}
              />
              {discussion}
            </>
          ) : (
            <div className={styles.prompt}>
              Chọn chiến dịch để xem gói, phần bổ sung và tổng tiền trước khi cam kết.
            </div>
          )}
        </div>
      </div>
      <section className={styles.history}>
        <h3>Cam kết của tôi</h3>
        {pledges.length ? (
          <div className={styles.pledgeRows}>
            {pledges.map((pledge) => (
              <div key={pledge.id}>
                <strong>{pledge.campaign.title}</strong>
                <span>{pledge.rewardTier?.title ?? 'Không nhận quà'}</span>
                <b>{money(pledge.totalAmount)}</b>
                <small>{statusLabel[pledge.status] ?? pledge.status}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Bạn chưa có cam kết nào trong PostgreSQL.</p>
        )}
      </section>
    </>
  );
}

function PledgeForm({
  campaign,
  busy,
  alreadyPledged,
  onAction,
}: {
  campaign: Campaign;
  busy: boolean;
  alreadyPledged: boolean;
  onAction: (path: string, body: unknown, message: string) => Promise<boolean>;
}) {
  const [rewardId, setRewardId] = useState('');
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [shippingOptionId, setShippingOptionId] = useState('');
  const [bonusAmount, setBonusAmount] = useState(50000);
  const reward = campaign.rewardTiers?.find((item) => item.id === rewardId);
  const addOns = campaign.addOns?.filter((item) => addOnIds.includes(item.id)) ?? [];
  const needsShipping = Boolean(
    reward?.requiresShipping || addOns.some((item) => item.requiresShipping),
  );
  const shipping = campaign.shippingOptions?.find((item) => item.id === shippingOptionId);
  const total =
    (reward?.amount ?? 0) +
    addOns.reduce((sum, item) => sum + item.amount, 0) +
    (needsShipping ? (shipping?.feeAmount ?? 0) : 0) +
    bonusAmount;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = {
      campaignId: campaign.id,
      rewardId: rewardId || undefined,
      addOnIds,
      bonusAmount,
      ...(needsShipping
        ? {
            shippingOptionId,
            address: {
              fullName: String(data.get('fullName')),
              phone: String(data.get('phone')),
              line1: String(data.get('line1')),
              city: String(data.get('city')),
            },
          }
        : {}),
    };
    void onAction(
      'pledges',
      body,
      'Đã lưu cam kết ở trạng thái chờ thanh toán. Chưa có giao dịch tiền.',
    );
  }
  return (
    <section className={styles.actionBox}>
      <h4>Cam kết ủng hộ</h4>
      {alreadyPledged ? (
        <p className={styles.helper}>
          Bạn đã có cam kết cho chiến dịch này. Xem ở danh sách bên dưới.
        </p>
      ) : (
        <form onSubmit={submit} className={styles.formStack}>
          <label>
            <Label>Gói ủng hộ</Label>
            <select
              value={rewardId}
              onChange={(event) => {
                setRewardId(event.target.value);
                setShippingOptionId('');
              }}
            >
              <option value="">Không nhận quà</option>
              {campaign.rewardTiers?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {money(item.amount)}
                </option>
              ))}
            </select>
          </label>
          {!!campaign.addOns?.length && (
            <fieldset>
              <legend>Phần bổ sung (nếu cần)</legend>
              {campaign.addOns.map((item) => (
                <label className={styles.checkInput} key={item.id}>
                  <input
                    type="checkbox"
                    checked={addOnIds.includes(item.id)}
                    onChange={(event) =>
                      setAddOnIds(
                        event.target.checked
                          ? [...addOnIds, item.id]
                          : addOnIds.filter((id) => id !== item.id),
                      )
                    }
                  />
                  {item.title} · {money(item.amount)}
                </label>
              ))}
            </fieldset>
          )}
          <label>
            <Label>Ủng hộ thêm (đồng)</Label>
            <input
              type="number"
              min={0}
              step={1000}
              value={bonusAmount}
              onChange={(event) => setBonusAmount(Number(event.target.value))}
            />
          </label>
          {needsShipping && (
            <>
              <label>
                <Label>Cách giao quà</Label>
                <select
                  value={shippingOptionId}
                  required
                  onChange={(event) => setShippingOptionId(event.target.value)}
                >
                  <option value="">Chọn cách giao</option>
                  {campaign.shippingOptions?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {money(item.feeAmount)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <Label>Họ tên người nhận</Label>
                <input name="fullName" required />
              </label>
              <label>
                <Label>Số điện thoại</Label>
                <input name="phone" type="tel" required />
              </label>
              <label>
                <Label>Địa chỉ nhận</Label>
                <input name="line1" required placeholder="Số nhà, đường, phường/xã" />
              </label>
              <label>
                <Label>Tỉnh/thành phố</Label>
                <input name="city" required />
              </label>
            </>
          )}
          <div className={styles.total}>
            <span>Tạm tính theo lựa chọn</span>
            <strong>{money(total)}</strong>
          </div>
          <p className={styles.helper}>
            Backend tính lại số tiền và kiểm tra gói, cách giao trước khi lưu. Cam kết này chưa
            thanh toán.
          </p>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={busy || total < 50000 || (needsShipping && !shippingOptionId)}
          >
            Lưu cam kết chờ thanh toán
          </button>
        </form>
      )}
    </section>
  );
}
