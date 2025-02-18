class PriorityQueue<T> {
  private heap: { value: T; priority: number }[] = [];

  enqueue(value: T, priority: number) {
      this.heap.push({ value, priority });
      this.bubbleUp();
  }

  dequeue(): T | null {
      if (this.isEmpty()) return null;
      const min = this.heap[0];
      const end = this.heap.pop();
      if (this.heap.length > 0 && end) {
          this.heap[0] = end;
          this.sinkDown();
      }
      return min.value;
  }

  isEmpty(): boolean {
      return this.heap.length === 0;
  }

  showHeap(): { value: T; priority: number }[]{
    return this.heap;
  } 

  private bubbleUp() {
      let idx = this.heap.length - 1;
      const element = this.heap[idx];
      while (idx > 0) {
          let parentIdx = Math.floor((idx - 1) / 2);
          let parent = this.heap[parentIdx];
          if (element.priority >= parent.priority) break;
          this.heap[parentIdx] = element;
          this.heap[idx] = parent;
          idx = parentIdx;
      }
  }

  private sinkDown() {
      let idx = 0;
      const length = this.heap.length;
      const element = this.heap[0];
      while (true) {
          let leftChildIdx = 2 * idx + 1;
          let rightChildIdx = 2 * idx + 2;
          let leftChild, rightChild;
          let swap = null;

          if (leftChildIdx < length) {
              leftChild = this.heap[leftChildIdx];
              if (leftChild.priority < element.priority) {
                  swap = leftChildIdx;
              }
          }

          if (rightChildIdx < length) {
              rightChild = this.heap[rightChildIdx];
              if (
                  (swap === null && rightChild.priority < element.priority) ||
                  (swap !== null && rightChild.priority < leftChild!.priority)
              ) {
                  swap = rightChildIdx;
              }
          }

          if (swap === null) break;
          this.heap[idx] = this.heap[swap];
          this.heap[swap] = element;
          idx = swap;
      }
  }
}

  export default PriorityQueue