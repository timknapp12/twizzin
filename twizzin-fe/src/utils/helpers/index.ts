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
