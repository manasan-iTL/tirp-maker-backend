import { PlaceType } from "src/const/placeTypes";
import { v2ReqSpot } from "src/types";
import { calcAverageStayTime } from "src/utils/calcAverageStayTime";
import { TimeConstraints } from "./calcRoutes";
import { calculateElapsedSeconds } from "src/utils/dates";


export interface TripDateTime {
    depaturesAt: string,
    destinationsAt: string
}

interface ValidateRouteRuleInitial {
    tripDateTimes: TripDateTime[],
    spots: v2ReqSpot[],
    eatingSpots: v2ReqSpot[]
}

interface SpotTotalTime {
    place_id: string,
    totalTime: number
}

interface MemoMustSpot {
    mustSpots: SpotTotalTime[] | null,
    index: number,
    eatingCount: number
}

interface MustPassNodesOnDay extends MemoMustSpot {
    activeTime: number
}

interface UsedEatingSpot {
    index: number,
    eatingSpots: string[]
}

class ValidateRouteRule {

    private activeTimes: number[] = []
    private BASE_MOVE_TIME = 60 * 60;
    private EATING_TIME = 60 * 90 + this.BASE_MOVE_TIME; 
    private _usedEatingSpots: UsedEatingSpot[] = [];
    private _leftMustNodes: v2ReqSpot[] = [];
    private _leftEatingNodes: v2ReqSpot[] = [];


    constructor({ tripDateTimes, spots, eatingSpots: addEatingSpots }: ValidateRouteRuleInitial) {
        const dateTimes = tripDateTimes.map(date => {
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

        const mustSpots = spots.filter(spot => spot.types.includes(PlaceType.must));
        const eatingSpots = spots.filter(spot => spot.types.includes(PlaceType.eating));

        this._leftMustNodes = mustSpots;
        this._leftEatingNodes = [...eatingSpots, ...addEatingSpots];

        this.activeTimes = dateTimes;
    }

    private _sortMustSpotTotalTimes(): SpotTotalTime[] {
        const mustTotalTimes: SpotTotalTime[] = this._leftMustNodes.map(spot => {
            const stayTime = calcAverageStayTime(spot.types);
            const totalTime = stayTime + this.BASE_MOVE_TIME

            return {
                place_id: spot.place_id,
                totalTime
            }
        })

        const sorted = [...mustTotalTimes].sort((nowSpot, nextSpot) => nowSpot.totalTime - nextSpot.totalTime);
        return sorted
    }

    private _calcSpotTotalTime(spots: SpotTotalTime[]): number {
        return spots.map(spot => spot.totalTime).reduce((now, next) => now + next, 0);
    }

    private _enableEatingSpot(index: number, eatingCount: number = 0): string[] | null {

        // COMMENT: 副作用のある操作
        if ( eatingCount === 2) {
            const lunch = this._leftEatingNodes.shift()
            const dinner = this._leftEatingNodes.shift()
            const eatingSpots: string[] = []

            if (lunch) {
                eatingSpots.push(lunch.place_id);
            }

            if (dinner) {
                eatingSpots.push(dinner.place_id);
            }

            if (eatingSpots.length > 0) {
                this._usedEatingSpots.push({ index, eatingSpots });
            }

            return (lunch && dinner)? [lunch.place_id, dinner.place_id] : null
        }

        if ( eatingCount === 1) {
            const dinner = this._leftEatingNodes.shift()

            if (dinner) {
                this._usedEatingSpots.push({ index, eatingSpots: [dinner.place_id] })
            }

            return dinner? [dinner.place_id] : null
        }

        return null
    }

    private _getMustPassesNodeOnSingle(): Set<string> {

        const mustPassNodes: string[] = [];
        let activeTime = this.activeTimes[0];

        // TODO: MUSTなスポットの滞在時間を計算して、短い順にソードする
        const mustTotalTimes = this._sortMustSpotTotalTimes();

        // TODO: 上記の配列を回しトータル時間から引いて時間が余っていれば、配列にIDを追加していく
        while (activeTime > 0 || mustTotalTimes.length > 0) {
            if (activeTime >= mustTotalTimes[0].totalTime) {
                mustPassNodes.push(mustTotalTimes[0].place_id)
                activeTime = activeTime - mustTotalTimes[0].totalTime
                mustTotalTimes.shift();

                // MustNodesが空の場合は抜ける
                if (mustTotalTimes.length <= 0) break;

                // COMMENT: 副作用の操作
                this._leftMustNodes = this._leftMustNodes.filter(mustNode => mustNode.place_id !== mustTotalTimes[0].place_id)
                continue;
            }

            break;
        }

        // TODO: 残った時間分、食事スポットが回れるのであれは。食事スポットのIDを
        let eatingCount = 0;
        const eatingSpots: string[] = [];
        while (activeTime > 0 || eatingCount >= 2) {
            if (activeTime >= this.EATING_TIME) {
                // COMMENT: 副作用の操作
                const eatingSpot = this._leftEatingNodes.shift() as v2ReqSpot;
                mustPassNodes.push(eatingSpot.place_id);
                eatingSpots.push(eatingSpot.place_id);
                activeTime = activeTime - this.EATING_TIME;
                eatingCount++
                continue;
            }

            break;
        }

        // 副作用のある操作
        this._usedEatingSpots.push({ index: 0, eatingSpots });

        return new Set(mustPassNodes);
    }

    private _getMustPassesNodesOnMutiple(): Set<string>[] {
        // 全体の活動時間 < MustSpotのトータルタイムなら例外スロー
        const totalActivaTimes = this.activeTimes.reduce((now, next) => now + next);
        let neededTimeMustSpot: SpotTotalTime[] = this._leftMustNodes.map(mustNode => {
            const stayTime = calcAverageStayTime(mustNode.types);

            const totalTime = stayTime + this.BASE_MOVE_TIME

            return {
                place_id: mustNode.place_id,
                totalTime
            }
        })

        let mustSpotsTotalTime = this._calcSpotTotalTime(neededTimeMustSpot);

        if (totalActivaTimes < mustSpotsTotalTime) throw new Error("旅行日数が足りません");
        

        // 活動時間が長い日を抽出（起点）
        const sortedActiveTimes = [...this.activeTimes].map((time, index) => ({ index, activeTime: time })).sort((a,b) => (a.activeTime > b.activeTime ? -1: 1))
        // const longerActiveTimeDay = sortedLongActiveTimes

        // 条件1 MustSpotsのトータルタイムとEatingSpot*2 の合計がavtiveTimeを超えているか
        // if (mustSpotsTotalTime + this.EATING_TIME * 2 < longerActiveTimeDay.activeTime) {
            
        //     console.log("MustPassNodes: 条件1で生成")
        //     // １日ごとにMustSPot + 食事場所を順番に追加する
        //     const mustPassNodesOnDays: Set<string>[] = this.activeTimes.map((time, index) => {
        //         const mustPassNodes: string[] = [];
        //         const eatingCount = (time > this.EATING_TIME * 2) ? 2: (time > this.EATING_TIME) ? 1: 0;
        //         const eatingSpots = (index === longerActiveTimeDay.index) ? this._enableEatingSpot(index, 2): this._enableEatingSpot(index, eatingCount)

        //         if (eatingSpots) {
        //             mustPassNodes.push(...eatingSpots)
        //         }

        //         if (index === longerActiveTimeDay.index) {
        //             const mustSpotPassNodes = this._leftMustNodes.map(node => node.place_id)
        //             mustPassNodes.push(...mustSpotPassNodes)
        //         }

        //         const result = new Set(mustPassNodes)

        //         return result
        //     })

        //     return mustPassNodesOnDays
        // }

        // 条件2 MustSpotsのトータルタイムとEatingSpot*1 の合計がavtiveTimeを超えているか
        // if (mustSpotsTotalTime + this.EATING_TIME < longerActiveTimeDay.activeTime) {

        //     console.log("MustPassNodes: 条件2で生成")
        //     // １日ごとにMustSPot + 食事場所を順番に追加する
        //     const mustPassNodesOnDays: Set<string>[] = this.activeTimes.map((time, index) => {
        //         const mustPassNodes: string[] = [];
        //         const eatingCount = (time > this.EATING_TIME * 2) ? 2: (time > this.EATING_TIME) ? 1: 0;

        //         const eatingspots = (index === longerActiveTimeDay.index) ? this._enableEatingSpot(index, 1) : this._enableEatingSpot(index, eatingCount)
        //         if (eatingspots) {
        //             mustPassNodes.push(...eatingspots)
        //         }

        //         if (index === longerActiveTimeDay.index) {
        //             const mustSpotPassNodes = this._leftMustNodes.map(node => node.place_id)
        //             mustPassNodes.push(...mustSpotPassNodes)
        //         }

        //         return new Set(mustPassNodes)
        //     })

        //     return mustPassNodesOnDays
        // }

        // 条件3 最も活動時間がある日からn個ずつMustSpotを減らしていく
        // 補足 ここで減らしたMustSpotsの時でループを抜ける

        // activeTimesをループさせ、1日の活動時間を取得する
        // MustSpotのトータルタイムが0ならば、Eating情報をだけ追加して早期リターン
        // 条件1/2を行う
        // それでだめな場合は以下のループを行う
           // mustSpotNodesのトータルタイムがactiveTimeを下回るまで
           // mustSpotNodesからNodeを1つ取り出し、ぞの分だけトータルタイムを減らす
           // 条件を満たしたらループを抜け出す
        // 一時保存したmustSpotNOdesを元にトータルタイムを計算し更新、

        const memoMustSpot: MemoMustSpot[] = []

        for (let index = 0; index < sortedActiveTimes.length; index++) {

            console.log("MustPassNodes: 条件3で生成")
            const totalMustTime = this._calcSpotTotalTime(neededTimeMustSpot)
            // 既にMust Spotsを回り切っている場合は、EatingCountだけ2にして次のループへ
            if (totalMustTime <= 0) {
                const eatingCount = (sortedActiveTimes[index].activeTime > this.EATING_TIME * 2) ? 2: (sortedActiveTimes[index].activeTime > this.EATING_TIME) ? 1: 0;
                memoMustSpot.push({ mustSpots: null, index: sortedActiveTimes[index].index, eatingCount: eatingCount })
                continue;
            }

            // MustSpotsがまだ存在し、EatingCount * 2で回れれる場合
            if (totalMustTime + this.EATING_TIME * 2 < sortedActiveTimes[index].activeTime) {
                memoMustSpot.push({ mustSpots: neededTimeMustSpot, index: sortedActiveTimes[index].index, eatingCount: 2 })
                
                // 全てのMUST SPOTを探索するため
                neededTimeMustSpot = [];
                continue;
            } 

            // MustSpotsがまだ存在し、EatingCount * 1で回れれる場合
            if (totalMustTime + this.EATING_TIME < sortedActiveTimes[index].activeTime) {
                memoMustSpot.push({ mustSpots: neededTimeMustSpot, index: sortedActiveTimes[index].index, eatingCount: 1 })

                // 全てのMUST SPOTを探索するため
                neededTimeMustSpot = [];
                continue;
            }

            let nextIterateMustNodes: SpotTotalTime[] = [];
            
            // その日でMust SPotsを全て回り切れない場合は、周れる限界まで周り残りは次の日に任せる
            while (true) {
                if (this._calcSpotTotalTime(neededTimeMustSpot) + this.EATING_TIME >= sortedActiveTimes[index].activeTime) {
                    // COMMENT: 副作用のある操作
                    const left = neededTimeMustSpot.pop();
                    if (!left) break;
    
                    // 次の日に回る
                    nextIterateMustNodes.push(left)
                    continue;
                }
                
                memoMustSpot.push({ mustSpots: neededTimeMustSpot, index: sortedActiveTimes[index].index, eatingCount: 1})
                break;
            }

            // トータルタイムの更新、nextNodesの更新を行う
            neededTimeMustSpot = nextIterateMustNodes;

            if (index === sortedActiveTimes.length - 1 && totalMustTime > 0) {
                console.warn("Must Passes Nodesの生成に失敗しました")
                throw new Error("指定された条件ではルート生成ができません");
            }
            
        }
        
        if (this.activeTimes.length !== memoMustSpot.length) throw new Error('旅行日数分のMustPassNOdesがありません!')

        const mustPassNodesOnDays: MustPassNodesOnDay[] = memoMustSpot.map(day => {
            return {
                ...day,
                activeTime: this.activeTimes[day.index]
            }
        })

        const sortmustPassNodesOnDays = [...mustPassNodesOnDays].sort((now, next) => now.index - next.index);

        const result: Set<string>[] = sortmustPassNodesOnDays.map(day => {

            const mustPassNodes: string[] = [];
            
            if (day.mustSpots) {
                const mustSpotId = day.mustSpots.map(spot => spot.place_id);
                mustPassNodes.push(...mustSpotId);
            }

            const eatingSpots = this._enableEatingSpot(day.index, day.eatingCount);

            if (eatingSpots) {
                mustPassNodes.push(...eatingSpots);
            }

            return new Set(mustPassNodes)
        })

        return result
        // 条件3-2 条件2が成立かつ、次点に長い日に取り出したMustSpotのトータルタイムとEating*1の合計がactiveTimeを超えているか

        // 条件4 MustSpotsのトータルタイムの合計がactiveTimeを超えているか

        // 条件5 条件3と同じことを行う
        // 条件5-1 条件2が成立かつ、次点に長い日に取り出したMustSpotのトータルタイムの合計がactiveTimeを超えているか

        // ここまでやりだめなら例外スロー

        // 活動時間が長い日にMustNodesを可能な限り追加する

        // 
    }

    /**
     * getTotalActiveTimes
     */
    public getTotalActiveTimes(): number[] {
        return this.activeTimes
    }

    /**
     * getMustPassesNodes
     */
    public getMustPassesNodes(day: number): Set<string>[] {
        
        if (day <= 1) return [this._getMustPassesNodeOnSingle()];

        if (day > 1) return this._getMustPassesNodesOnMutiple();

        return [new Set()];
    }

    /**
     * getTimeConstraints
     */
    public getTimeConstraints(tripDateTimes: TripDateTime[]): TimeConstraints[] {
        // usedEatingSpotsの型
        // { index: number, eatingSpots: srting[] }

        // COMMENT: TimeConstraintの型をnull許容にする

        // 上記をindexを元に昇順で並び替える
        const usedEatingSpots = [...this._usedEatingSpots].sort((now, next) => now.index - next.index);

        if (usedEatingSpots.length <= 0) {
            const none = { 'NONE': [[0, 0]] };
            return Array(tripDateTimes.length).fill(none);
        }
        
        // 一つずつ取り出し、以下の処理を行う
        // 条件1 eatingSpotsの数が0であれば、nullを返す
        // 条件2 eatingSopotsの数が1であれば、keyをplace_id、calculateElapsedSeconds(activeTime, "17:00", "22:00")
        // 条件3 eatingSopotsの数が2であれば、keyをplace_id、calculateElapsedSeconds(activeTime, "11:00", "15:00") calculateElapsedSeconds(activeTime, "17:00", "22:00")

        const timeConstraints: TimeConstraints[] = usedEatingSpots.map((spot, index) => {
            let none = 'NONE'

            if (spot.eatingSpots.length < 0) return {[none]: [[0, 0]]}

            if (spot.eatingSpots.length === 1) {
                const baseTime = tripDateTimes[index].depaturesAt
                const { startElapsedSeconds, endElapsedSeconds } = calculateElapsedSeconds(baseTime, "17:00", tripDateTimes[index].destinationsAt )
                const id = spot.eatingSpots[0]

                return {
                    [id]: [[startElapsedSeconds, endElapsedSeconds]]
                }
            }

            if (spot.eatingSpots.length === 2) {
                const baseTime = tripDateTimes[index].depaturesAt
                const { startElapsedSeconds: dinnerStartSeconds, endElapsedSeconds: dinnerEndSeconds } = calculateElapsedSeconds(baseTime, "17:00", tripDateTimes[index].destinationsAt )
                const { startElapsedSeconds: lunchStartSeconds, endElapsedSeconds: lunchEndSeconds } = calculateElapsedSeconds(baseTime, "11:00", "15:00" )
                const lunch_id = spot.eatingSpots[0]
                const dinner_id = spot.eatingSpots[1]

                return {
                    ...{ [lunch_id]: [[lunchStartSeconds, lunchEndSeconds]] },
                    ...{ [dinner_id]: [[dinnerStartSeconds, dinnerEndSeconds]]}
                }
            }

            return {[none]: [[0, 0]]}
        })

        console.log(timeConstraints)

        return timeConstraints
    }
}

export default ValidateRouteRule