import { Request } from "express";
import GPlacesRepo from "src/repositories/gPlacesRepo";
import GRouteRepo from "src/repositories/gRoutesRepo";
import { v2ReqSpot, v2SearchSpots } from "src/types";
import { calculateStayDuration } from "src/utils/dates";

interface IsValidTripInfoArgs {
    origin: v2ReqSpot,
    destination: v2ReqSpot,
    depatureDate: string,
    returnedDate: string,

    gRouteRepo: GRouteRepo,
    gPlacesRepo: GPlacesRepo

    req: Request<unknown, unknown, v2SearchSpots> 
}

export interface TripDateTime {
    depaturesAt: string,
    destinationsAt: string
}

class ValidateTripRule {

    private activeTimes: number[] = []
    private days: number = 0;

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

    private _setDays(days: number) {
        this.days = days
    }

    /**
     * getDays
     */
    public getDays() {
        return this.days;
    }

    /**
     * isValidTripInfo
     * 旅行日数に対して行動時間が旅行日数×4時間未満ならエラーを返す

     */
    public async isValidTripInfo(
        {
            origin, 
            destination, 
            depatureDate, 
            returnedDate, 
            gRouteRepo, 
            gPlacesRepo,
            req
        }: IsValidTripInfoArgs): Promise<v2ReqSpot> {

        // TODO: 出発地のLocationを取得する
        const depatureLocation = await gPlacesRepo.getDepatureLocation(origin);

        // TODO: 旅行日数の計算
        const { nights, days } = calculateStayDuration(depatureDate, returnedDate);
        this._setDays(days);

        if (days >= 3) return depatureLocation

        // TODO: Routes APIへのリクエスト
        const response = await gRouteRepo.getRouteDuration({ origin: depatureLocation, destination });
        if (!response) throw new Error("ネットワークエラーが起きました")
        
        // TODO: 移動時間のチェック
        const durationNum = parseInt(response.routes[0].duration.slice(0, -1), 10);

        req.session.originMoveDestination = durationNum;

        console.log('移動時間')
        console.log(durationNum)
        console.log(req.session.originMoveDestination)

        const activeTotalSeconds = this.activeTimes.reduce((prev, current) => prev + current)

        if (activeTotalSeconds - durationNum * 2 < 60 * 60 * 4 * days)
            throw new Error("移動時間が長く活動できません")
    
        return depatureLocation
    }
}

export default ValidateTripRule