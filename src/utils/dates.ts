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
    const endInSeconds = timeStringToSeconds(endTime) - (60 * 60 * 1);

    // 開始時刻と終了時刻の経過秒を計算
    const startElapsedSeconds = startInSeconds - baseTimeInSeconds;
    const endElapsedSeconds = endInSeconds - baseTimeInSeconds;

    return { startElapsedSeconds, endElapsedSeconds };
}