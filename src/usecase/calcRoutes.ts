import { PlaceType } from "src/const/placeTypes";
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
      constraints: Constraints,
      theme: string,
      isRecrusion: boolean
    ) : string[] {
      const bestResults: PathResult[] = [];

      // 全ての経路を探索する
      if (
        theme === PlaceType.amusementPark ||
        theme === PlaceType.themePark ||
        theme === PlaceType.hiking ||
        theme === PlaceType.marineSports ||
        theme === PlaceType.snowSports
      ) {
        console.log('時間制約なし')
        this._dfsWithConditionsIterative(graph, startNode, endNode, isRecrusion, constraints, bestResults)
      } else {
        console.log('時間制約あり')
        this._dfsWithConditionsIterativeWithTimeConstraint(graph, startNode, endNode, isRecrusion, constraints, bestResults);
      }

      // 1回目の探索でルートが見つからない場合、時間制約の条件で探索せず、mustNodesにも食事スポットを入れない
      if (bestResults.length < 1) {
        const keys = Object.keys(constraints.timeConstraints);
        // TimeConstraints オブジェクトからキーを取得し、mustNodes に存在するものを削除
        for (const key of keys) {
            if (constraints.mustPassNodes.has(key)) {
                constraints.mustPassNodes.delete(key);
            }
        }

        console.log('2回目の探索')
        console.dir(constraints, {depth: null, colors: true})
        this._dfsWithConditionsIterative(graph, startNode, endNode, isRecrusion, constraints, bestResults)
      }

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
    private _dfsWithConditionsIterative(
      graph: NewGraph,
      startNode: string,
      endNode: string,
      isRecrusion: boolean,
      constraints: Constraints,
      bestResults: PathResult[]
  ): void {
      // スタックに初期状態をプッシュ
      const stack: {
          currentNode: string;
          path: string[];
          totalTime: number;
          visitCount: Map<string, number>; // 各ノードの訪問回数
          mustPassNodes: Set<string>;
      }[] = [
          {
              currentNode: startNode,
              path: [startNode],
              totalTime: 0,
              visitCount: isRecrusion ? new Map([[startNode, 1]]) : new Map([[startNode, 2]]),
              mustPassNodes: new Set(constraints.mustPassNodes),
          },
      ];
  
      // スタックが空になるまで探索
      while (stack.length > 0) {
          const { currentNode, path, totalTime, visitCount, mustPassNodes } = stack.pop()!;
  
          // 制約を超えた場合はスキップ
          if (totalTime > constraints.maxTotalTime) continue;
  
          // 終点に到達した場合の処理
          if (currentNode === endNode && path.length > 1) {
              if (mustPassNodes.size === 0) { // 全必須ノードを通過しているか確認
                  bestResults.push(new PathResult([...path], totalTime));
              }
              continue;
          }
  
          // 現在のノードが必須ノードの場合はセットから削除
          const updatedMustPassNodes = new Set(mustPassNodes);
          if (mustPassNodes.has(currentNode)) {
              updatedMustPassNodes.delete(currentNode);
          }
  
          // 次のノードへの移動
          for (const edge of graph[currentNode]) {
              const nextNode = edge.to;
  
              const nextVisitCount = visitCount.get(nextNode) || 0;

              // 再訪問制限
              if (nextNode === startNode) {
                  if (nextVisitCount >= 2) continue; // 始点の再訪問は2回まで許可
              } else if (nextVisitCount > 0) {
                  continue; // 他のノードは1回だけ訪問可能
              }
  
              // 時間制約のチェック
              const nextArrivalTime = totalTime + edge.travelTime;
              // if (!isValidTimeConstraint(nextNode, nextArrivalTime, nextArrivalTime + edge.stayTime)) continue;

              const updatedVisitCount = new Map(visitCount);
              updatedVisitCount.set(nextNode, nextVisitCount + 1);
  
              // 新しい状態をスタックにプッシュ
              stack.push({
                  currentNode: nextNode,
                  path: [...path, nextNode],
                  totalTime: nextArrivalTime + edge.stayTime,
                  visitCount: updatedVisitCount,
                  mustPassNodes: updatedMustPassNodes,
              });
          }
      }
  }

      /**
     * dfsWithConditions
     * 
     * 条件を考慮したルートを全探索で捜索する
     */
      private _dfsWithConditionsIterativeWithTimeConstraint(
        graph: NewGraph,
        startNode: string,
        endNode: string,
        isRecrusion: boolean,
        constraints: Constraints,
        bestResults: PathResult[],
    ): void {
        // スタックに初期状態をプッシュ
        const stack: {
            currentNode: string;
            path: string[];
            totalTime: number;
            visitCount: Map<string, number>; // 各ノードの訪問回数
            mustPassNodes: Set<string>;
        }[] = [
            {
                currentNode: startNode,
                path: [startNode],
                totalTime: 0,
                visitCount: isRecrusion ? new Map([[startNode, 1]]) : new Map([[startNode, 2]]),
                mustPassNodes: new Set(constraints.mustPassNodes),
            },
        ];
    
        // ヘルパー関数: 時間制約のチェック
        const isValidTimeConstraint = (node: string, arrivalTime: number, depatureTime: number): boolean => {
            const timeRanges = constraints.timeConstraints[node];
            if (!timeRanges) return true;
            return timeRanges.some(([startTime, endTime]) => arrivalTime >= startTime && depatureTime <= endTime);
        };
    
        // スタックが空になるまで探索
        while (stack.length > 0) {
            const { currentNode, path, totalTime, visitCount, mustPassNodes } = stack.pop()!;
    
            // 制約を超えた場合はスキップ
            if (totalTime > constraints.maxTotalTime) continue;
    
            // 終点に到達した場合の処理
            if (currentNode === endNode && path.length > 1) {
                if (mustPassNodes.size === 0) { // 全必須ノードを通過しているか確認
                    bestResults.push(new PathResult([...path], totalTime));
                }
                continue;
            }
    
            // 現在のノードが必須ノードの場合はセットから削除
            const updatedMustPassNodes = new Set(mustPassNodes);
            if (mustPassNodes.has(currentNode)) {
                updatedMustPassNodes.delete(currentNode);
            }
    
            // 次のノードへの移動
            for (const edge of graph[currentNode]) {
                const nextNode = edge.to;
    
                const nextVisitCount = visitCount.get(nextNode) || 0;
  
                // 再訪問制限
                if (nextNode === startNode) {
                    if (nextVisitCount >= 2) continue; // 始点の再訪問は2回まで許可
                } else if (nextVisitCount > 0) {
                    continue; // 他のノードは1回だけ訪問可能
                }
    
                // 時間制約のチェック
                const nextArrivalTime = totalTime + edge.travelTime;
                if (!isValidTimeConstraint(nextNode, nextArrivalTime, nextArrivalTime + edge.stayTime)) continue;
  
                const updatedVisitCount = new Map(visitCount);
                updatedVisitCount.set(nextNode, nextVisitCount + 1);
    
                // 新しい状態をスタックにプッシュ
                stack.push({
                    currentNode: nextNode,
                    path: [...path, nextNode],
                    totalTime: nextArrivalTime + edge.stayTime,
                    visitCount: updatedVisitCount,
                    mustPassNodes: updatedMustPassNodes,
                });
            }
        }
    }
}

export default CalcRoutes