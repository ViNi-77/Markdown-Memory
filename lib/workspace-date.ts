const WORKSPACE_TIME_ZONE = "Asia/Tokyo";

const workspaceDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: WORKSPACE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatWorkspaceDateTime(value: Date | number | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = Object.fromEntries(
    workspaceDateTimeFormatter
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}
