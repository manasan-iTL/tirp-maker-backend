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