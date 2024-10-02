export type PriorityQueueItem = [string, number];

export interface PriorityQueue {
  enqueue(item: PriorityQueueItem): void;
  dequeue(): PriorityQueueItem | undefined;
  isEmpty(): boolean;
}

// TODO: 優先度付きキューの仕様を理解する
class PriorityQueueImpl implements PriorityQueue {
    private _heap: PriorityQueueItem[];
    private _comparator: (a: PriorityQueueItem, b: PriorityQueueItem) => boolean;
  
    constructor(comparator: (a: PriorityQueueItem, b: PriorityQueueItem) => boolean) {
      this._heap = [];
      this._comparator = comparator;
    }
  
    isEmpty(): boolean {
      return this._heap.length === 0;
    }
  
    enqueue(item: PriorityQueueItem): void {
      this._heap.push(item);
      this._siftUp();
    }
  
    dequeue(): PriorityQueueItem | undefined {
      if (this.isEmpty()) return undefined;
  
      const poppedValue = this._heap[0];
      const bottom = this._heap.pop()!;
      if (this._heap.length > 0) {
        this._heap[0] = bottom;
        this._siftDown();
      }
      return poppedValue;
    }
  
    private _siftUp(): void {
      let nodeIdx = this._heap.length - 1;
      while (nodeIdx > 0 && this._comparator(this._heap[nodeIdx], this._heap[this._parent(nodeIdx)])) {
        this._swap(nodeIdx, this._parent(nodeIdx));
        nodeIdx = this._parent(nodeIdx);
      }
    }
  
    private _siftDown(): void {
      let nodeIdx = 0;
      while (
        (this._left(nodeIdx) < this._heap.length && this._comparator(this._heap[this._left(nodeIdx)], this._heap[nodeIdx])) ||
        (this._right(nodeIdx) < this._heap.length && this._comparator(this._heap[this._right(nodeIdx)], this._heap[nodeIdx]))
      ) {
        const greaterChildIdx =
          this._right(nodeIdx) < this._heap.length && this._comparator(this._heap[this._right(nodeIdx)], this._heap[this._left(nodeIdx)])
            ? this._right(nodeIdx)
            : this._left(nodeIdx);
        this._swap(nodeIdx, greaterChildIdx);
        nodeIdx = greaterChildIdx;
      }
    }
  
    private _parent(idx: number): number {
      return ((idx + 1) >>> 1) - 1;
    }
  
    private _left(idx: number): number {
      return (idx << 1) + 1;
    }
  
    private _right(idx: number): number {
      return (idx + 1) << 1;
    }
  
    private _swap(i: number, j: number): void {
      [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
    }
  }

  export default PriorityQueueImpl