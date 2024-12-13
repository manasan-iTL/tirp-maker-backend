import { DirectionsResponse } from "@googlemaps/google-maps-services-js"
import { BasicInfo, SpotCard, Route, TrafficRoute, TrafficCard, Spot } from "../types"

export const convertRoutes = (directionResponse: DirectionsResponse, dayDepartureAt: string, spots: Spot[], originSpot: Spot, destinationSpot: Spot) => {

    // 定数化
    const legs = directionResponse.data.routes[0].legs
    const wayPointRoutes: Route[] = []

    // ルート間の経過時間を返す
    const routesDuration: number[] = legs.map((leg) => leg.duration.value * 1000)

    for (let i=0; i<legs.length; i++) {
            
        // 初回の処理
        if (i == 0) {
            // 出発時間の生成
            const departure_date = new Date(dayDepartureAt)
            departure_date.setHours(8)
    
            const departure_year = departure_date.getFullYear();
            const departure_month = String(departure_date.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
            const departure_day = String(departure_date.getDate()).padStart(2, '0');
            const departure_hour = String(departure_date.getHours()).padStart(2, '0');
            const departure_minute = String(departure_date.getMinutes()).padStart(2, '0');
    
            // Spotcardの追加
            const responseDepartureSpot: SpotCard = {
                category: "SPOT",
                spot: originSpot,
                type: "DEPARTURE",
                departure_at: `${departure_year}-${departure_month}-${departure_day}-${departure_hour}-${departure_minute}`,
                arrived_at: ""
            }
            wayPointRoutes.push(responseDepartureSpot)
    
            // 到着時間の生成
            const arrived_at = new Date(departure_date.getTime() + routesDuration[0])
    
            // String型に整形
            const year = arrived_at.getFullYear();
            const month = String(arrived_at.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
            const day = String(arrived_at.getDate()).padStart(2, '0');
            const hour = String(arrived_at.getHours()).padStart(2, '0');
            const minute = String(arrived_at.getMinutes()).padStart(2, '0');
    
            const route: TrafficRoute = {
                way: "CAR",
                departure: `${departure_year}-${departure_month}-${departure_day}-${departure_hour}-${departure_minute}`,
                arrive: `${year}-${month}-${day}-${hour}-${minute}`
            } 
    
            const trafficCard: TrafficCard = {
                category: "TRAFFIC",
                routes: [route]
            }
    
            wayPointRoutes.push(trafficCard)
            continue
        }
    
        // 最後の処理
        if (i == legs.length - 1) {
    
            // 該当スポットの取得
            const index = directionResponse.data.routes[0].waypoint_order[i - 1]
            const spot: Spot = spots[index]
    
            // 先のスポットから現在地に到着する時間の取得
            const wayPoint = wayPointRoutes[i * 2 - 1]
            const arrived_at = wayPoint.category === "SPOT"? wayPoint.arrived_at : wayPoint.routes[0].arrive
    
            // タイプの変換
            const type = spot.type.includes("restaurant") ? "EATING": "WAYPOINT"
    
            
            // 現在地を出発する時間
            const stayTime = type === "EATING"? 1 : 2
            const tempArry = arrived_at.split("-")
            const departure_at = new Date(Number(tempArry[0]), Number(tempArry[1]) - 1, Number(tempArry[2]), Number(tempArry[3]), Number(tempArry[4]))
            departure_at.setHours(departure_at.getHours() + stayTime)
    
            // String型に整形
            const year = departure_at.getFullYear();
            const month = String(departure_at.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
            const day = String(departure_at.getDate()).padStart(2, '0');
            const hour = String(departure_at.getHours()).padStart(2, '0');
            const minute = String(departure_at.getMinutes()).padStart(2, '0');
    
            // SpotCardの生成・追加
            const SpotCard: SpotCard = {
                category: "SPOT",
                spot: spot,
                arrived_at: arrived_at,
                departure_at: `${year}-${month}-${day}-${hour}-${minute}`,
                type: type
            }
    
            wayPointRoutes.push(SpotCard)
    
    
            // TrafficCardの追加
    
            const arrive_at_destination = new Date(new Date(departure_at).getTime() + routesDuration[i])
    
            // String型に整形
            const arrive_at_destination_year = arrive_at_destination.getFullYear();
            const arrive_at_destination_month = String(arrive_at_destination.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
            const arrive_at_destination_day = String(arrive_at_destination.getDate()).padStart(2, '0');
            const arrive_at_destination_hour = String(arrive_at_destination.getHours()).padStart(2, '0');
            const arrive_at_destination_minute = String(arrive_at_destination.getMinutes()).padStart(2, '0');
    
            const route: TrafficRoute = {
                way: "CAR",
                departure:  `${year}-${month}-${day}-${hour}-${minute}`,
                arrive: `${arrive_at_destination_year}-${arrive_at_destination_month}-${arrive_at_destination_day}-${arrive_at_destination_hour}-${arrive_at_destination_minute}`
            } 
    
            const TrafficCard: TrafficCard = {
                category: "TRAFFIC",
                routes: [route]
            }
    
            wayPointRoutes.push(TrafficCard)
    
            // 目的地の追加
            const responseDestinationSpot: SpotCard = {
                category: "SPOT",
                spot: destinationSpot,
                type: "DESTINATION",
                departure_at: "",
                arrived_at: `${arrive_at_destination_year}-${arrive_at_destination_month}-${arrive_at_destination_day}-${arrive_at_destination_hour}-${arrive_at_destination_minute}`
            }
    
            wayPointRoutes.push(responseDestinationSpot)
            break
        }
    
        // 通常時の処理
    
        // SpotCardの追加
        const index = directionResponse.data.routes[0].waypoint_order[i - 1]
        const spot: Spot = spots[index]
    
        // 先のスポットから現在地に到着する時間の取得
        const wayPoint = wayPointRoutes[i * 2 - 1]
        const arrived_at = wayPoint.category === "SPOT"? wayPoint.arrived_at : wayPoint.routes[0].arrive
    
        // タイプの変換
        const type = spot.type.includes("restaurant") ? "EATING": "WAYPOINT"
    
            
        // 現在地を出発する時間
        const stayTime = type === "EATING"? 1: 2
        const tempArry = arrived_at.split("-")
        const departure_at = new Date(Number(tempArry[0]), Number(tempArry[1]) - 1, Number(tempArry[2]), Number(tempArry[3]), Number(tempArry[4]))
        departure_at.setHours(departure_at.getHours() + stayTime)
    
        // String型に整形
        const year = departure_at.getFullYear();
        const month = String(departure_at.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
        const day = String(departure_at.getDate()).padStart(2, '0');
        const hour = String(departure_at.getHours()).padStart(2, '0');
        const minute = String(departure_at.getMinutes()).padStart(2, '0');
    
        // SpotCardの生成・追加
        const SpotCard: SpotCard = {
            category: "SPOT",
            spot: spot,
            arrived_at: arrived_at,
            departure_at: `${year}-${month}-${day}-${hour}-${minute}`,
            type: type
        }
    
        wayPointRoutes.push(SpotCard)
    
        // TrafficCardの追加
        const arrive_at_destination = new Date(new Date(departure_at).getTime() + routesDuration[i])
    
        // String型に整形
        const arrive_at_destination_year = arrive_at_destination.getFullYear();
        const arrive_at_destination_month = String(arrive_at_destination.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
        const arrive_at_destination_day = String(arrive_at_destination.getDate()).padStart(2, '0');
        const arrive_at_destination_hour = String(arrive_at_destination.getHours()).padStart(2, '0');
        const arrive_at_destination_minute = String(arrive_at_destination.getMinutes()).padStart(2, '0');
    
        const route: TrafficRoute = {
            way: "CAR",
            departure:  `${year}-${month}-${day}-${hour}-${minute}`,
            arrive: `${arrive_at_destination_year}-${arrive_at_destination_month}-${arrive_at_destination_day}-${arrive_at_destination_hour}-${arrive_at_destination_minute}`
        } 
    
        const TrafficCard: TrafficCard = {
            category: "TRAFFIC",
            routes: [route]
        }
    
        wayPointRoutes.push(TrafficCard)
    }

    return wayPointRoutes
}

export const convertSpots = (spots: Spot[], numberPerSpot: number) => {
    // 生成した結果を配列に格納
    const result: Spot[][] = []
    let tempArr: Spot[] = []
    
    // spotsを分割する
    for (let i = 0; i < spots.length; i++) {
        
        tempArr.push(spots[i])
        if ((i + 1) % numberPerSpot === 0) {
            result.push(tempArr)
            tempArr = []
            tempArr.push(spots[i])
        }
    }
    return result
} 

export const calcNextDate = (date: string, index: number) => {
    const new_date = new Date(date)
    new_date.setDate(new_date.getDate() + 1 * index)
    new_date.setHours(8)

    const departure_year = new_date.getFullYear();
    const departure_month = String(new_date.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
    const departure_day = String(new_date.getDate()).padStart(2, '0');
    return `${departure_year}-${departure_month}-${departure_day}`
}