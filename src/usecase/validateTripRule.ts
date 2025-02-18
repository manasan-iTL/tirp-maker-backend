import { Request } from "express";
import { ApiError, ValidationError } from "src/error/CustomError";
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
     * 
     * @param {IsValidTripInfoArgs} 
     * @returns 
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

        try {

        // TODO: 出発地のLocationを取得する
        const depatureLocation = await gPlacesRepo.getDepatureLocation(origin);

        // TODO: 旅行日数の計算
        const { nights, days } = calculateStayDuration(depatureDate, returnedDate);
        this._setDays(days);


        // TODO: Routes APIへのリクエスト
        const response = await gRouteRepo.getRouteDuration({ origin: depatureLocation, destination });
        if (!response) throw new Error("ネットワークエラーが起きました")
        
        // TODO: 移動時間のチェック
        const durationNum = parseInt(response.routes[0].duration.slice(0, -1), 10);

        req.session.originMoveDestination = durationNum;

        const activeTotalSeconds = this.activeTimes.reduce((prev, current) => prev + current)

        if (days <= 2) {
            if (activeTotalSeconds - durationNum * 2 < 60 * 60 * 4)
                throw new ValidationError("移動時間が長く活動できません")
        } else {
            if (activeTotalSeconds - durationNum * 2 < 60 * 60 * 3)
                throw new ValidationError('移動時間が長く活動できません')
        }
    
        return depatureLocation
            
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error
            }

            throw new ApiError('Google Routes APIへのリクエストが失敗しました')
        }
    }
}

export default ValidateTripRule