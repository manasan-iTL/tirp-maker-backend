import { RouteMatrixResBody } from "src/repositories/gRoutesMatrixRepo"
import { v2RouteSpot } from "src/types"
import { calcAverageStayTime } from "src/utils/calcAverageStayTime"

interface GetDistanceArgs {
    spots: v2RouteSpot[],
    routes: RouteMatrixResBody[]
}

interface GetNewDistanceArgs {
    spots: v2RouteSpot[],
    routes: RouteMatrixResBody[]
}

export interface Distance {
    origin: v2RouteSpot,
    destination: v2RouteSpot,
    durationSecond: number,
    meters: number
}

export interface NewDistance {
    origin: v2RouteSpot,
    destination: v2RouteSpot,
    durationSecond: number,
    meters: number,
    stayedTime: number,
}

export type Edge = {
    to: string;        // 移動先ノード
    travelTime: number; // 移動時間
    stayTime: number;   // 滞在時間
};

export interface Graph {
    [key: string]: { [key: string]: number };
  }

export interface NewGraph {
    [key: string]: Edge[]
}

class BuiltGraph {

    /**
     * getDistance
     */
    public getDistance(args: GetDistanceArgs): Distance[] {
        const { spots, routes } = args;

        const onlyExists = routes.filter(route => route.condition === "ROUTE_EXISTS")

        const distances: Distance[] = onlyExists.map(route => {

            // COMMENT: 数値型にキャストする
            // TODO: ここの重み計算（現状移動時間だけ）に到着先の平均滞在時間も含めてしまう
            const numberStr = route.duration.slice(0, -1); // 末尾の1文字を削除
            const durationSec = parseInt(numberStr, 10);

            return {
                origin: spots[route.originIndex],
                destination: spots[route.destinationIndex],
                durationSecond: durationSec,
                meters: route.distanceMeters
            }
        })

        return distances
    }

    /**
     * getNewDistance
     */
    public getNewDistance(args: GetNewDistanceArgs): NewDistance[] {
        const { spots, routes } = args;

        const onlyExists = routes.filter(route => route.duration !== '0s' && route.condition === "ROUTE_EXISTS")

        const distances: NewDistance[] = onlyExists.map(route => {

            // COMMENT: 数値型にキャストする
            // TODO: ここの重み計算（現状移動時間だけ）に到着先の平均滞在時間も含めてしまう
            const numberStr = route.duration.slice(0, -1); // 末尾の1文字を削除
            const durationSec = parseInt(numberStr, 10);

            // COMMENT: Type毎に平均滞在時間を算出する
            const averageStay = calcAverageStayTime(spots[route.destinationIndex].types)

            return {
                origin: spots[route.originIndex],
                destination: spots[route.destinationIndex],
                durationSecond: durationSec,
                meters: route.distanceMeters,
                stayedTime: averageStay
            }
        })

        return distances
    }

    /**
     * buildGraph
    */
    public buildGraph(args: Distance[]): Graph {
        const graph: Graph = {}
        const copyArr = args.concat();

        copyArr.forEach(distance => {
            const { origin, destination, durationSecond: dist } = distance;
            if (!graph[origin.place_id]) {
              graph[origin.place_id] = {};
            }
            graph[origin.place_id][destination.place_id] = dist;
        });

        return graph
    }

    /**
     * buildNewGraph
     */
    public buildNewGraph(args: NewDistance[]): NewGraph {
        const graph: NewGraph = {}
        const copyArr = args.concat();

        copyArr.forEach(({ origin, destination, durationSecond, stayedTime }) => {
            const originId = origin.place_id.toString();
            const destinationId = destination.place_id;
        
            if (!graph[originId]) {
              graph[originId] = [];
            }
        
            graph[originId].push({
              to: destinationId,
              travelTime: durationSecond,
              stayTime: stayedTime
            });
        
            // 必要に応じて無向グラフにする場合は以下を追加
            // if (!graph[destinationId]) {
            //   graph[destinationId] = [];
            // }
        
            // graph[destinationId].push({
            //   to: originId,
            //   travelTime: durationSecond,
            //   stayTime: stayedTime
            // });
        });

        return graph
    }
}

export default BuiltGraph