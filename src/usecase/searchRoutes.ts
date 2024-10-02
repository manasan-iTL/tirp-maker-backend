import path from "path";
import { DayPlan, Plan, Route, SpotCard, TrafficCard, TrafficRoute, v2DayPlan, v2Plan, v2Route, v2RouteSpot, v2RoutesReq, v2SpotCard } from "src/types";
import { Graph, NewGraph } from "./builtGraph";
import { PlaceType } from "src/const/placeTypes";
import { TimeConstraints } from "./calcRoutes";

interface ConvertPlanArgs {
    spots: v2RouteSpot[] | undefined,
    graph: Graph
}

interface NewGraphConvertPlanArgs {
    spots: v2RouteSpot[] | undefined,
    graph: NewGraph
}

class SearchRoutes {
    private _spots: v2RoutesReq;
    private _eatings: v2RouteSpot[];
    private _mustSpots: v2RouteSpot[];

    constructor(args: v2RoutesReq) {
        this._spots = args;
        const eating = args.waypoints.filter(spot => spot.types.includes(PlaceType.eating))
        this._eatings = eating;
        const mustWaySpots = args.waypoints.filter(spot => spot.types.includes(PlaceType.must))
        this._mustSpots = [...eating, ...mustWaySpots];
    }

    /**
     * getOriginid
     */ 
    public getOriginId() {
        return this._spots.originSpot.place_id
    }

    /**
     * getDestinationHotelId
     */
    public getDestinationHotelId() {
        return this._spots.destinationSpot.place_id
    }

    /**
     * getAllWaypointsId
     */
    public getAllWaypointsId() {
        const ids = this._spots.waypoints.map(waypoint => waypoint.place_id);
        return ids
    }

    /**
     * getMustWaypoint
     */
    public getMustWaypoint() {
        const ids = this._mustSpots.map(spot => spot.place_id);
        return ids;
    }

    /**
     * createTimeConstraints
     */
    public createTimeConstraints() : TimeConstraints {
        const ids = this._eatings.map(spot => spot.place_id);
        const lunch = ids[0]
        const dinner = ids[1]


        return {
            [lunch]: [
                [ 60*60*4, 60*60*6 ]
            ],
            [dinner]: [
                [ 60*60*10, 60*60*12 ]
            ]
        }
    }

    /**
     * convertPathToSpots
     */
    public convertPathToSpots(
        args: {
        path: string[],
    } | null
    ): v2RouteSpot[] | undefined {
        if (!args) return undefined

        const originalSpots = [this._spots.originSpot, ...this._spots.waypoints, this._spots.destinationSpot]
        const spots = args.path.map(id => originalSpots.find(spot => spot.place_id === id)) as v2RouteSpot[];
        return spots
    }

    /**
     * convert
     */
    public convertV2Plan(args: ConvertPlanArgs): v2Plan {
        if (!args.spots) return []

        // COMMENT: 一旦実行時の時間で計算する
        const dayTime = new Date();
        dayTime.setHours(8, 0, 0, 0);

        // spotsをグラフのEdegに変換する
        const routes : v2Route[] = []

        // COMMENT: 滞在時間は全て1時間とする
        const stayedTime = 60 * 60

        for (let i = 0; i < args.spots.length; i++) {

            // COMMENT: 最初の要素はDeparture
            if (i == 0) {

                // COMMENT: 到着時間の計算
                const depature_at = dayTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                
                const spotCard: v2SpotCard = {
                    category: "SPOT",
                    spot: args.spots[i],
                    departure_at: depature_at,
                    arrived_at: "",
                    type: "DEPARTURE"
                }

                routes.push(spotCard)

                // TrafficCardの作成
                const duration = args.graph[args.spots[i].place_id][args.spots[i + 1].place_id];
                dayTime.setSeconds(dayTime.getSeconds() + duration);

                const trafficRoute: TrafficRoute = {
                    way: "CAR",
                    departure: depature_at,
                    arrive: dayTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })   
                }

                const trafficCard: TrafficCard = {
                    category: "TRAFFIC",
                    routes: [trafficRoute]
                }

                routes.push(trafficCard)
                continue
            }

            // COMMENT: 到着地のときだけ
            if (i == args.spots.length - 1) {
                const arrive_at = dayTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                
                const SpotCard: v2SpotCard = {
                    category: "SPOT",
                    spot: args.spots[i],
                    arrived_at: arrive_at,
                    departure_at: "",
                    type: "DESTINATION"
                }

                routes.push(SpotCard)
                continue
            }

            // COMMENT: 経由地を通るときの処理
            const arrive_at = dayTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            dayTime.setSeconds(dayTime.getSeconds() + stayedTime);
            const depature_at = dayTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            
            const waypointCard: v2SpotCard = {
                category: "SPOT",
                spot: args.spots[i],
                departure_at: depature_at,
                arrived_at: arrive_at,
                type: "WAYPOINT"
            }

            routes.push(waypointCard)

            const duration = args.graph[args.spots[i].place_id][args.spots[i + 1].place_id];
            dayTime.setSeconds(dayTime.getSeconds() + duration);

            const trafficRoute: TrafficRoute = {
                way: "CAR",
                departure: depature_at,
                arrive: dayTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }

            const trafficCard: TrafficCard = {
                category: "TRAFFIC",
                routes: [trafficRoute]
            }

            routes.push(trafficCard)
        }

        const dayRoute: v2DayPlan = {
            Routes: routes
        }

        return [dayRoute]
    }

    /**
     * v2NewGraphConvertPlan
     */
    public v2NewGraphConvertPlan({ spots, graph }: NewGraphConvertPlanArgs) :v2Plan {
        if (!spots) return []

        // COMMENT: 一旦実行時の時間で計算する
        const dayTime = new Date();
        dayTime.setHours(8, 0, 0, 0);

        const routes : v2Route[] = []

        for (let i = 0; i < spots.length; i++) {

            // COMMENT: 最初の要素はDeparture
            if (i == 0) {

                // COMMENT: 到着時間の計算
                const depature_at = this._formatDateString(dayTime)
                
                const spotCard: v2SpotCard = {
                    category: "SPOT",
                    spot: spots[i],
                    departure_at: depature_at,
                    arrived_at: "",
                    type: "DEPARTURE"
                }

                routes.push(spotCard)

                // TrafficCardの作成
                const { arriveTime } = this._extrackTime(i, spots, graph);
                dayTime.setSeconds(dayTime.getSeconds() + arriveTime);

                const trafficRoute: TrafficRoute = {
                    way: "CAR",
                    departure: depature_at,
                    arrive: this._formatDateString(dayTime)
                }

                const trafficCard: TrafficCard = {
                    category: "TRAFFIC",
                    routes: [trafficRoute]
                }

                routes.push(trafficCard)
                continue
            }

            // COMMENT: 到着地のときだけ
            if (i == spots.length - 1) {
                const arrive_at = this._formatDateString(dayTime)
                
                const SpotCard: v2SpotCard = {
                    category: "SPOT",
                    spot: spots[i],
                    arrived_at: arrive_at,
                    departure_at: "",
                    type: "DESTINATION"
                }

                routes.push(SpotCard)
                continue
            }

            // COMMENT: 経由地を通るときの処理
            const arrive_at = this._formatDateString(dayTime)
            const { arriveTime, stayTime } = this._extrackTime(i, spots, graph);
            dayTime.setSeconds(dayTime.getSeconds() + stayTime);
            const depature_at = this._formatDateString(dayTime)
            
            const waypointCard: v2SpotCard = {
                category: "SPOT",
                spot: spots[i],
                departure_at: depature_at,
                arrived_at: arrive_at,
                type: "WAYPOINT"
            }

            routes.push(waypointCard)
;
            dayTime.setSeconds(dayTime.getSeconds() + arriveTime);

            const trafficRoute: TrafficRoute = {
                way: "CAR",
                departure: depature_at,
                arrive: this._formatDateString(dayTime)
            }

            const trafficCard: TrafficCard = {
                category: "TRAFFIC",
                routes: [trafficRoute]
            }

            routes.push(trafficCard)
        }

        const dayRoute: v2DayPlan = {
            Routes: routes
        }

        return [dayRoute]
    }

    private _formatDateString(date: Date) {
        return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    private _extrackTime(currentIndex: number, spots: v2RouteSpot[], graph: NewGraph): { arriveTime: number, stayTime: number } {
        const nextNode = graph[spots[currentIndex].place_id].find(node => node.to === spots[currentIndex + 1].place_id);
        const arriveTime = nextNode?.travelTime ?? 0;
        const stayTime = nextNode?.stayTime ?? 0;

        return {
            arriveTime,
            stayTime
        }
    }
}

export default SearchRoutes