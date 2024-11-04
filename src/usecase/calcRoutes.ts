import { Graph, NewGraph } from "./builtGraph";
import PathResult from "./PathResult";
import PriorityQueue from "./priorityQueue/newVersion";

type Result = {
    path: string[],
    distance: number,
    graph: Graph
} | null


interface RouteState {
    node: string;
    totalTime: number;
    passedSpots: Set<string>;
    path: string[];
}

export interface TimeConstraints { 
    [spot: string]: [number, number][] 
};

export interface Constraints {
  maxTotalTime: number;          // 最大総行動時間（秒）
  mustPassNodes: Set<string>;    // 必ず通過しなければならないノードの集合
  timeConstraints: TimeConstraints; // 時間制約
}

class CalcRoutes {

    /**
     * findShortestPathWithConstraints
     * 必須の経由地を回る最短経路を求める
     */
    public findShortestPathWithConstraints(
        graph: Graph,
        start: string,
        end: string,
        mustVisit: string[]
    ): Result {
        
        // mustVisitの順列をすべて生成（すべての経路パターン）
        const allOrders = this._permute(mustVisit);

        let shortestPath: string[] | null = null;
        let shortestDistance = Infinity;

        // すべての訪問順序に対して経路を計算
        for (const order of allOrders) {
            const path = [start, ...order, end];
            const distance = this._calculatePathDistance(graph, path);

            if (distance < shortestDistance) {
            shortestDistance = distance;
            shortestPath = path;
            }
        }

        if (shortestPath) {
            return { path: shortestPath, distance: shortestDistance, graph };
        } else {
            return null;
        }
    }

    private _calculatePathDistance(graph: Graph, path: string[]): number {
        let distance = 0;
        for (let i = 0; i < path.length - 1; i++) {
          const from = path[i];
          const to = path[i + 1];
          distance += graph[from][to];
        }
        return distance;
    }

    private _permute(arr: string[]): string[][] {
        if (arr.length === 0) return [[]];
        return arr.flatMap((item, idx) =>
          this._permute(arr.slice(0, idx).concat(arr.slice(idx + 1))).map(perm => [item, ...perm])
        );
    }

    // TODO: 移動時間が特定の次元を超えない
    
    /**
     * findRouteWithConditions
       ダイクストラ法で条件にマッチしたルートパスを返す
    */
    public findRouteWithConditions(
        graph: NewGraph,
        start: string,
        end: string,
        mustPassSpots: string[],
        timeWithInSpots?: TimeConstraints,
        maxTotalTime: number = 60 * 60 * 12
    ) : string[] | null {
        const pq = new PriorityQueue<RouteState>();
        const visited = new Map<string, Set<string>>();
        const mustPassSet = new Set(mustPassSpots);

        pq.enqueue({ node: start, totalTime: 0, passedSpots: new Set([start]), path: [start] }, 0);

        while (!pq.isEmpty()) {

            // console.log("current Heap")
            // console.dir(pq.showHeap())

            const current = pq.dequeue()!;
            const { node, totalTime, passedSpots, path } = current;

            console.count("While Loop")
            console.log(`Node=${node}, TotalTime=${totalTime}, PassedSpots=${Array.from(passedSpots).join(',')}, Path=${path.join('->')}`);

            if (node === end && mustPassSpots.every(spot => passedSpots.has(spot))) {
              console.log("生成終了")
              return path;
            }
        

            if (visited.has(node)) {
              const existingSpots = visited.get(node)!;
              if (Array.from(existingSpots).every(spot => passedSpots.has(spot))) {
                  console.log(`Skipping node: ${node} as it is already visited with a sufficient passedSpots`);
                  continue;
              }
            }
            visited.set(node, passedSpots);
        
            for (const edge of graph[node]) {
              const nextNode = edge.to;
              const newTotalTime = totalTime + edge.travelTime + edge.stayTime;
              const newPassedSpots = new Set(passedSpots); // 新しい通過スポットのセット
              const newPath = [...path, nextNode]; // 新しい経路
        
              if (newTotalTime > maxTotalTime) {
                console.log("時間が超えたら次のNodeを探索")
                continue;
              }
        
              if (mustPassSet.has(nextNode)) {
                newPassedSpots.add(nextNode);
              }
        
              const timeRanges = timeWithInSpots?.[nextNode] || [[0, Infinity]];
              const arrivalTime = totalTime + edge.travelTime;


              // デバッグログ: 次のノードと到着時間
              console.log(`Considering next node: ${nextNode}, arrivalTime: ${arrivalTime}`);
        
              if (!timeWithInSpots || this._isWithinTimeConstraints(arrivalTime, timeRanges)) {
                pq.enqueue({ node: nextNode, totalTime: newTotalTime, passedSpots: newPassedSpots, path: newPath }, newTotalTime);
              }
            }
        }

        return null
    }

    private _isWithinTimeConstraints(arrivalTime: number, timeRanges: [number, number][]): boolean {
        for (const [startTime, endTime] of timeRanges) {
            if (arrivalTime >= startTime && arrivalTime <= endTime) {
              return true;
            }
          }
          return false;
    }

    /**
     * v2DfsfindShortestRoute
     */
    public v2DfsfindShortestRoute(
      graph: NewGraph,
      startNode: string,
      endNode: string,
      constraints: Constraints
    ) : string[] {
      const currentPath: string[] = [];
      const currentTotalTime = 0;  // 初期の総行動時間は0からスタート
      const bestResults: PathResult[] = [];
  
      // 訪問ノードを追跡するセット
      const visited: Set<string> = new Set();

          // 全ての経路を探索する
      this._dfsWithConditions(graph, startNode, endNode, currentPath, currentTotalTime, constraints, bestResults, visited, new Set(constraints.mustPassNodes));

    // 最短経路を見つける
    let shortestRoute: PathResult | null = null;
    for (const result of bestResults) {

        // COMMENT: 最も短いルートを算出する
        // if (!shortestRoute || result.totalTime < shortestRoute.totalTime) {
        //     shortestRoute = result;
        // }

        // COMMENT: 最も多くスポットを巡れるルートを算出
        if (!shortestRoute || result.path.length > shortestRoute.path.length) {
          shortestRoute = result;
        }
    }

    return shortestRoute ? shortestRoute.path : [];
    }

    /**
     * dfsWithConditions
     * 
     * 条件を考慮したルートを全探索で捜索する
     */
    private _dfsWithConditions(
      graph: NewGraph,
      currentNode: string,
      endNode: string,
      currentPath: string[],
      currentTotalTime: number,
      constraints: Constraints,
      bestResults: PathResult[],
      visited: Set<string>,
      mustPassNodes: Set<string>
  ): void {
      // 現在のノードを訪問済みとしてパスに追加
      currentPath.push(currentNode);
      visited.add(currentNode);
  
      // 現在の総行動時間が制約を超えた場合は探索終了
      if (currentTotalTime > constraints.maxTotalTime) {
          currentPath.pop();
          visited.delete(currentNode);
          return;
      }
  
      // 終点に到達した場合、経路を結果に保存
      if (currentNode === endNode) {
          if (mustPassNodes.size === 0) {  // 全ての必須ノードを通過していることを確認
              const result = new PathResult([...currentPath], currentTotalTime);
              bestResults.push(result);
          }
          currentPath.pop();
          visited.delete(currentNode);
          return;
      }
  
      // 現在のノードが必ず通過するノードの集合に含まれているか確認
      const mustPassNodeIncluded = mustPassNodes.has(currentNode);
      if (mustPassNodeIncluded) {
          mustPassNodes.delete(currentNode);  // ノードを集合から削除
      }
  
      // 次の移動先を探索
      for (const edge of graph[currentNode]) {
          const nextNode = edge.to;
  
          // 既に訪れたノードへの移動をスキップ
          if (visited.has(nextNode)) {
              continue;
          }
  
          // 時間制約のチェック
          if (constraints.timeConstraints[nextNode]) {
              const timeRanges = constraints.timeConstraints[nextNode];
              const nextArrivalTime = currentTotalTime + edge.travelTime;
  
              let canProceed = false;
              for (const [startTime, endTime] of timeRanges) {
                  if (nextArrivalTime >= startTime && nextArrivalTime <= endTime) {
                      canProceed = true;
                      break;
                  }
              }
  
              if (!canProceed) {
                  continue;  // 時間帯に合わない場合はスキップ
              }
          }
  
          // 移動時間と滞在時間を加算して再帰的に探索
          this._dfsWithConditions(graph, nextNode, endNode, currentPath, currentTotalTime + edge.travelTime + edge.stayTime, constraints, bestResults, visited, mustPassNodes);
      }
  
      // mustPassNodesを元の状態に戻す
      if (mustPassNodeIncluded) {
          mustPassNodes.add(currentNode);
      }
  
      // 現在のノードをパスから削除して戻る
      currentPath.pop();
      visited.delete(currentNode);
  }
}

export default CalcRoutes