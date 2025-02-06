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
