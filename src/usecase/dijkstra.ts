import { Graph } from "./builtGraph"; 
import PriorityQueueImpl, { PriorityQueue } from "./priorityQueueImpl";

interface DistancesDijkstra {
    [key: string]: number
}

interface PreviousNodes {
    [key: string]: string | undefined
}

export const dijkstraWithEnd = (graph: Graph, start: string, goal: string): string[] | null => {
    const distances: DistancesDijkstra = {};
    const previous: PreviousNodes = {};
    const pq: PriorityQueue = new PriorityQueueImpl((a, b) => a[1] < b[1]);
  
    distances[start] = 0;
    pq.enqueue([start, 0]);
  
    while (!pq.isEmpty()) {
      const [currentNode, currentDistance] = pq.dequeue()!;
  
      // 終点に到達した場合、最短経路を生成して返す
      if (currentNode === goal) {
        const path: string[] = [];
        let temp: string | undefined = goal;
        while (temp !== undefined) {
          path.push(temp);
          temp = previous[temp];
        }
        return path.reverse();
      }
  
      for (let neighbor in graph[currentNode]) {
        const distance = currentDistance + graph[currentNode][neighbor];
        if (distance < (distances[neighbor] || Infinity)) {
          distances[neighbor] = distance;
          previous[neighbor] = currentNode;
          pq.enqueue([neighbor, distance]);
        }
      }
    }
  
    return null; // 終点に到達できない場合
  };


  // COMMENT: 以下は特定の始点からすべてのNodeに対する最短経路を導出する関数

  const dijkstraAllShortestPath = (graph: Graph, start: string): { distances: { [key: string]: number }, previous: { [key: string]: string | null } } => {
    const distances: DistancesDijkstra = {};
    const previous: { [key: string]: string | null } = {};
    const pq: PriorityQueue = new PriorityQueueImpl((a, b) => a[1] < b[1]);
  
    distances[start] = 0;
    pq.enqueue([start, 0]);
  
    while (!pq.isEmpty()) {
      const [currentNode, currentDistance] = pq.dequeue()!;
  
      for (let neighbor in graph[currentNode]) {
        const distance = currentDistance + graph[currentNode][neighbor];
        if (distance < (distances[neighbor] || Infinity)) {
          distances[neighbor] = distance;
          previous[neighbor] = currentNode;
          pq.enqueue([neighbor, distance]);
        }
      }
    }
  
    return { distances, previous };
  };
  
  // 最短経路を構築する関数
  const constructPath = (previous: { [key: string]: string | null }, start: string, goal: string): string[] => {
    const path: string[] = [];
    let current: string | null = goal;
  
    while (current !== null) {
      path.push(current);
      current = previous[current];
    }
  
    return path.reverse();
  };