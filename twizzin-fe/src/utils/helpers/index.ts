export const getGameTimeInSeconds = (
  startTime: number | string,
  endTime: number | string
) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }

  const timeDiff = end.getTime() - start.getTime();
  const timeDiffInSeconds = Math.floor(timeDiff / 1000);

  return timeDiffInSeconds;
};

export const formatGameTime = (
  startTime: number | string,
  endTime: number | string
) => {
  const totalSeconds = getGameTimeInSeconds(startTime, endTime);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Pad seconds with leading zero if less than 10
  const formattedSeconds = seconds.toString().padStart(2, '0');

  return `${minutes}:${formattedSeconds}`;
};

export const getRemainingTime = (startTime: number | string) => {
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();
  const timeDiff = start - now;

  if (timeDiff <= 0) return 'Game has started!';

  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const hours = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};
