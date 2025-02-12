// When sending to Anchor program:
export const getAnchorTimestamp = (date: Date): number => {
  return date.getTime(); // Returns milliseconds
};

// When sending to Supabase:
export const getSupabaseTimestamp = (date: Date): string => {
  return date.toISOString(); // Format: "2024-12-27T17:00:00.000Z"
};

export const formatSupabaseDate = (
  timestamptz: string,
  locale: string = 'en-US'
): string => {
  // converts iso string to date object
  const date = new Date(timestamptz);
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

export const getGameTimeInSeconds = (
  startTime: string | number, // Can accept either ISO string from Supabase or timestamp
  endTime: string | number
) => {
  // Convert both to milliseconds for consistent handling
  const startMs =
    typeof startTime === 'string' ? new Date(startTime).getTime() : startTime;
  const endMs =
    typeof endTime === 'string' ? new Date(endTime).getTime() : endTime;

  if (isNaN(startMs) || isNaN(endMs)) {
    throw new Error('Invalid date format');
  }

  const timeDiff = endMs - startMs;
  return Math.floor(timeDiff / 1000);
};

export const formatGameTime = (
  startTime: string | number,
  endTime: string | number
) => {
  const totalSeconds = getGameTimeInSeconds(startTime, endTime);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const getRemainingTime = (startTime: string | number) => {
  const now = Date.now();
  const startMs =
    typeof startTime === 'string' ? new Date(startTime).getTime() : startTime;

  const timeDiff = startMs - now;

  if (timeDiff <= 0) return 'Game has started!';

  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const hours = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

export const countDownGameTime = (endTime: string | number): string => {
  const now = Date.now();
  const endMs =
    typeof endTime === 'string' ? new Date(endTime).getTime() : endTime;
  const timeDiff = endMs - now;

  if (timeDiff <= 0) {
    return 'Time is up!';
  }

  const totalSeconds = Math.floor(timeDiff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper function to calculate total time in milliseconds between start and end time
export const calculateTotalTimeMs = (
  startTime: string,
  endTime: string
): number => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return end - start;
};
