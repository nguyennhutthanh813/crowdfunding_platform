export const defaultNotificationPreferences = {
  projectUpdates: true,
  pledgeStatus: true,
  recommendations: true,
  creatorTasks: false,
  moderationAlerts: false,
};

export type NotificationPreferences = Omit<
  typeof defaultNotificationPreferences,
  "moderationAlerts"
> & { moderationAlerts?: boolean };

export function isNotificationPreferences(
  value: unknown,
): value is NotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(defaultNotificationPreferences);
  // Bốn trường cũ vẫn được nhận để các client demo trước đây không bị lỗi.
  return (
    Object.keys(record).every((key) => keys.includes(key)) &&
    keys.every((key) =>
      key === "moderationAlerts" && record[key] === undefined
        ? true
        : typeof record[key] === "boolean",
    )
  );
}
