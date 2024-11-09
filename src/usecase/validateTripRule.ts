import GRouteRepo from "src/repositories/gRoutesRepo";
import { v2ReqSpot } from "src/types";
import { calculateStayDuration } from "src/utils/dates";

interface IsValidTripInfoArgs {
    origin: v2ReqSpot,
    destination: v2ReqSpot,
    depatureDate: string,
    returnedDate: string,

    gRouteRepo: GRouteRepo
}

export interface TripDateTime {
    depaturesAt: string,
    destinationsAt: string
}

class ValidateTripRule {

    private activeTimes: number[] = []

    constructor(args: { tripDateTimes: TripDateTime[] }) {
        const dateTimes = args.tripDateTimes.map(date => {
            const [departureHour, departureMinute] = date.depaturesAt.split(":"); 
            const [destinationHour, destinationMinute] = date.destinationsAt.split(":"); 

            const depatureTotal = 
                parseInt(departureMinute, 10) * 60 + 
                parseInt(departureHour, 10) * 60 * 60
            
            const destinationTotal = 
                parseInt(destinationMinute, 10) * 60 + 
                parseInt(destinationHour, 10) * 60 * 60 
            
            return destinationTotal - depatureTotal
        })

        this.activeTimes = dateTimes;
    }

    /**
     * isValidTripInfo
     * 旅行日数に対して行動時間が旅行日数×4時間未満ならエラーを返す

     */
    public async isValidTripInfo({ origin, destination, depatureDate, returnedDate, gRouteRepo }: IsValidTripInfoArgs) {

        // TODO: 旅行日数の計算
        const { nights, days } = calculateStayDuration(depatureDate, returnedDate);

        if (days >= 3) return true

        // TODO: Routes APIへのリクエスト
        const response = await gRouteRepo.getRouteDuration({ origin, destination });
        if (!response) throw new Error("ネットワークエラーが起きました")
        
        // TODO: 移動時間のチェック
        const durationNum = parseInt(response.routes[0].duration.slice(0, -1), 10);

        const activeTotalSeconds = this.activeTimes.reduce((prev, current) => prev + current)

        if (activeTotalSeconds - durationNum * 2 < 60 * 60 * 4 * days)
            throw new Error("移動時間が長く活動できません")
    
        return true
    }
}

export default ValidateTripRule