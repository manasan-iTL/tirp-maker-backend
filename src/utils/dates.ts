export function calculateStayDuration(startDateStr: string, endDateStr: string): { days: number, nights: number } {
    // 入力の文字列をDateオブジェクトに変換
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // 日数差をミリ秒単位で計算
    const diffTime = endDate.getTime() - startDate.getTime();

    // 1日をミリ秒単位で計算
    const oneDay = 1000 * 60 * 60 * 24;

    // 差を日数に変換
    const days = Math.ceil(diffTime / oneDay) + 1;

    // 宿泊は「日数 - 1」として計算
    const nights = days - 1;

    return { days, nights };
}


export function calculateElapsedSeconds(
    baseTime: string,
    startTime: string,
    endTime: string
): { startElapsedSeconds: number; endElapsedSeconds: number } {
    // 時刻文字列をDateオブジェクトに変換するためのヘルパー関数
    const timeStringToSeconds = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 3600 + minutes * 60;
    };

    // 基準時刻、開始時刻、終了時刻を秒に変換
    const baseTimeInSeconds = timeStringToSeconds(baseTime);
    const startInSeconds = timeStringToSeconds(startTime);
    const endInSeconds = timeStringToSeconds(endTime);

    // 開始時刻と終了時刻の経過秒を計算
    const startElapsedSeconds = startInSeconds - baseTimeInSeconds;
    const endElapsedSeconds = endInSeconds - baseTimeInSeconds;

    return { startElapsedSeconds, endElapsedSeconds };
}

/**
 * 時間文字列を秒単位に変換する関数
 */
export const timeStringToSeconds = (time: string): number => {
    const [hours, minutes] = time.split(":");
    return parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60;
};
  
  /**
   * 秒単位を時間文字列に変換する関数
   */
  export const secondsToTimeString = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  
  /**
   * 判定ロジック（秒単位）
   */
  export const isTimeInRangeSeconds = (
    departureTime: string, // 出発時間（例: "8:00:00"）
    travelTime: number, // 平均移動時間（秒単位）+ 平均滞在時間（秒単位）
    rangeStart: string | number, // 範囲開始時間（例: "11:00:00"）
    rangeEnd: string | number // 範囲終了時間（例: "15:00:00"）
  ): boolean => {
    // 各時間を秒単位に変換
    const departureSeconds = timeStringToSeconds(departureTime);
    const rangeStartSeconds = typeof rangeStart === 'number' ? rangeStart: timeStringToSeconds(rangeStart);
    const rangeEndSeconds = typeof rangeEnd === 'number' ? rangeEnd : timeStringToSeconds(rangeEnd);
  
    // 合計時間を計算
    const totalTimeSeconds = departureSeconds + travelTime;
  
    // 範囲内かどうか判定
    return totalTimeSeconds >= rangeStartSeconds && totalTimeSeconds <= rangeEndSeconds;
  };

  /**
   * 
   * @param departureTime 
   * @param baseTime 
   * @param moveTime 
   * @param stayTime 
   * @returns 
   */
  export function isTimeOver(
    departureTime: string,
    baseTime: string | number,
    moveTime: number,
    stayTime: number
  ): boolean {
    const departureSeconds = timeStringToSeconds(departureTime);
    const baseTimeSeconds = typeof baseTime === 'number' ? baseTime: timeStringToSeconds(baseTime);
    
    return baseTimeSeconds >= (departureSeconds + moveTime + stayTime)

  }

  export function isExsistTimeRange(
    rangeStart: string | number,
    rangeEnd: string | number,
    expectHour: number
  ): boolean {
    const rangeStartSeconds = typeof rangeStart === 'number' ? rangeStart: timeStringToSeconds(rangeStart);
    const rangeEndSeconds = typeof rangeEnd === 'number' ? rangeEnd : timeStringToSeconds(rangeEnd);

    return rangeEndSeconds - rangeStartSeconds >= expectHour
  }