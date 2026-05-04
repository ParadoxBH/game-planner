export function getDailyResetTimes(now: number, resetTimeStr: string = "00:00") {
  const [hours, minutes] = resetTimeStr.split(":").map(Number);
  const nowDate = new Date(now);
  
  const lastReset = new Date(nowDate);
  lastReset.setHours(hours, minutes, 0, 0);
  
  if (lastReset.getTime() > now) {
    lastReset.setDate(lastReset.getDate() - 1);
  }
  
  const nextReset = new Date(lastReset);
  nextReset.setDate(nextReset.getDate() + 1);
  
  return { lastReset: lastReset.getTime(), nextReset: nextReset.getTime() };
}

export function getWeeklyResetTimes(now: number, resetTimeStr: string = "00:00", resetDay: number = 1) {
  const [hours, minutes] = resetTimeStr.split(":").map(Number);
  const nowDate = new Date(now);
  
  const lastReset = new Date(nowDate);
  lastReset.setHours(hours, minutes, 0, 0);
  
  // getDay() 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  let dayDiff = lastReset.getDay() - resetDay;
  if (dayDiff < 0) dayDiff += 7;
  lastReset.setDate(lastReset.getDate() - dayDiff);
  
  if (lastReset.getTime() > now) {
    lastReset.setDate(lastReset.getDate() - 7);
  }
  
  const nextReset = new Date(lastReset);
  nextReset.setDate(nextReset.getDate() + 7);
  
  return { lastReset: lastReset.getTime(), nextReset: nextReset.getTime() };
}
