export function formatTime(value) {
  if (!value) return '';
  const [hour, minute] = value.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 || 12;
  return `${twelve}:${String(minute).padStart(2, '0')} ${suffix}`;
}
