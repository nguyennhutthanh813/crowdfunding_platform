// Một người có thể cộng tác ở nhiều dự án với các quyền khác nhau.
export function campaignMemberKey(campaignId: string, userId: string) {
  return `${campaignId}:${userId}`;
}
