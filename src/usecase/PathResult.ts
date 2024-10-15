class PathResult {
    path: string[];
    totalTime: number;

    constructor(path: string[], totalTime: number) {
        this.path = path;
        this.totalTime = totalTime;
    }
}

export default PathResult