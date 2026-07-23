export function formatDueDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function isOverdue(value: string, status: string) {
  const due = new Date(`${value}T23:59:59`);
  return status !== "Done" && due.getTime() < Date.now();
}

