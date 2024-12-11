import { PlaceType } from "src/const/placeTypes";
import { v2ReqSpot } from "src/types";
import { calcAverageStayTime } from "src/utils/calcAverageStayTime";
import { TimeConstraints } from "./calcRoutes";
import { calculateElapsedSeconds, isExsistTimeRange, isTimeInRangeSeconds, isTimeOver, secondsToTimeString, timeStringToSeconds } from "src/utils/dates";


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
    types: string[],
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

interface EnableEating {
    value: boolean,
    startPeriod: string,
    endPeriod: string
}

interface LunchAndDinner {
    isLunch: EnableEating,
    isDinner: EnableEating
}

interface EatingSpot {
    id: string,
    type: 'LUNCH' | 'DINNER',
    startPeriod: string,
    endPeriod: string
}

interface UsedEatingSpot {
    index: number,
    baseTime: string,
    eatingSpots: EatingSpot[]
}

class ValidateRouteRule {

    private activeTimes: number[] = []
    private tripDateTimes: TripDateTime[] = []
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
        this.tripDateTimes = tripDateTimes
    }

    private _sortMustSpotTotalTimes(): SpotTotalTime[] {
        const mustTotalTimes: SpotTotalTime[] = this._leftMustNodes.map(spot => {
            const stayTime = calcAverageStayTime(spot.types);
            const totalTime = stayTime + this.BASE_MOVE_TIME

            return {
                place_id: spot.place_id,
                types: spot.types,
                totalTime
            }
        })

        const sorted = [...mustTotalTimes].sort((nowSpot, nextSpot) => nowSpot.totalTime - nextSpot.totalTime);
        return sorted
    }

    private _calcSpotTotalTime(spots: SpotTotalTime[]): number {
        return spots.map(spot => spot.totalTime).reduce((now, next) => now + next, 0);
    }

    private _enableEatingSpot(index: number, eatingCount: number = 0, moveTime: number): string[] | null {

        const { isLunch, isDinner } = this._checkEatingCountOnMove(index, moveTime, moveTime);
        const baseTime = this.tripDateTimes[index].depaturesAt;
        const result: string[] = [];
        const DINNER: 'DINNER' | 'LUNCH' = 'DINNER';
        const LUNCH: 'DINNER' | 'LUNCH' = 'LUNCH';

        // 条件1: eatingCountが0の場合、何もしない
        if (eatingCount === 0) {
            console.log('条件1でEatingを生成する')
            this._usedEatingSpots.push({ index, baseTime: this.tripDateTimes[index].depaturesAt, eatingSpots: [] })
            return null 
        }

        // 条件2: isLunch / isDinnerの両方が正の場合
        if (isLunch.value && isDinner.value) {
            if (eatingCount === 1) {
                console.log('条件2-1でEatingを生成する')
                const [addSpot] = this._leftEatingNodes.splice(0, 1);
                const eatingSpot = {
                    id: addSpot.place_id,
                    type: DINNER,
                    startPeriod: isDinner.startPeriod,
                    endPeriod: isDinner.endPeriod
                }

                this._usedEatingSpots.push({
                    index,
                    baseTime,
                    eatingSpots: [eatingSpot]
                })
                result.push(addSpot.place_id)
                return result
            }
            
            if (eatingCount === 2) {
                console.log('条件2-2でEatingを生成する')
                const [first, second] = this._leftEatingNodes.splice(0, 2);

                const lunchSpot = {
                    id: first.place_id,
                    type: LUNCH,
                    startPeriod: isLunch.startPeriod,
                    endPeriod: isLunch.endPeriod
                }

                const dinnerSpot = {
                    id: second.place_id,
                    type: DINNER,
                    startPeriod: isDinner.startPeriod,
                    endPeriod: isDinner.endPeriod
                }

                this._usedEatingSpots.push({
                    index,
                    baseTime,
                    eatingSpots: [lunchSpot, dinnerSpot]
                })

                result.push(first.place_id, second.place_id)
                return result                
            }
        }

        // 条件3 isLunch 正 isDinner 負の場合
        if (isLunch.value && !isDinner.value) {
            if (eatingCount === 1 || eatingCount === 2) {
                console.log('条件3でEatingを生成する')
                const [addSpot] = this._leftEatingNodes.splice(0, 1);
                const eatingSpot = {
                    id: addSpot.place_id,
                    type: LUNCH,
                    startPeriod: isLunch.startPeriod,
                    endPeriod: isLunch.endPeriod
                }

                this._usedEatingSpots.push({
                    index,
                    baseTime,
                    eatingSpots: [eatingSpot]
                })
                result.push(addSpot.place_id)
                return result
            }
        }

        // 条件4 isLunch 負 isDinner 正の場合
        if (!isLunch.value && isDinner.value) {
            if (eatingCount === 1 || eatingCount === 2) {
                console.log('条件4でEatingを生成する')
                const [addSpot] = this._leftEatingNodes.splice(0, 1);
                const eatingSpot = {
                    id: addSpot.place_id,
                    type: DINNER,
                    startPeriod: isDinner.startPeriod,
                    endPeriod: isDinner.endPeriod
                }

                this._usedEatingSpots.push({
                    index,
                    baseTime,
                    eatingSpots: [eatingSpot]
                })
                result.push(addSpot.place_id)
                return result
            }
        }

        // 条件5 食事の時間が取れないため、何もしない
        console.log('条件5でEatingを生成する')
        this._usedEatingSpots.push({ index, baseTime: this.tripDateTimes[index].depaturesAt, eatingSpots: [] })

        return result
    }

    // MustSpotがある日の場合
    private _checkSkipEating(spots: SpotTotalTime[]): boolean {
        const skipEatingSpots = spots.filter(spot => (
            spot.types.includes(PlaceType.amusementPark) ||
            spot.types.includes(PlaceType.themePark)||
            spot.types.includes(PlaceType.hiking) ||
            spot.types.includes(PlaceType.marineSports) ||
            spot.types.includes(PlaceType.snowSports)
        ))

        return skipEatingSpots.length > 0
    }

    // MustSpotは無いが、テーマが条件に合致する場合
    private _checkSkipEatingWithKeyword(eatingCount: number, theme: string): number {
        if (
            theme === PlaceType.amusementPark ||
            theme === PlaceType.themePark ||
            theme === PlaceType.hiking ||
            theme === PlaceType.marineSports ||
            theme === PlaceType.snowSports
        ) {
            eatingCount = eatingCount - 1;
        }

        if (eatingCount < 0) return 0

        return eatingCount
    }

    private _checkEatingCountOnMove(
        index: number, 
        depatureFromMoveTime: number,
        destinationFromMoveTime: number,
    ): LunchAndDinner {
        const { depaturesAt, destinationsAt } = this.tripDateTimes[index];

        let addDepatureMoveTime = undefined;
        let addDestinationMoveTime = undefined;

        // 日帰りの場合、出発時間と到着時間の両方に移動時間が必要
        if (this.tripDateTimes.length === 1) {
            addDepatureMoveTime = depatureFromMoveTime
            addDestinationMoveTime = destinationFromMoveTime
            console.log(`初日の出発に加算する値: ${addDepatureMoveTime} 到着に加算する値: ${addDestinationMoveTime}`)
        }

        // 複数日程 && 初日の場合
        if (this.tripDateTimes.length > 1 && index === 0) {
            addDepatureMoveTime = depatureFromMoveTime
            console.log(`複数日・初日の出発に加算する値: ${addDepatureMoveTime} 到着に加算する値: ${addDestinationMoveTime}`)
        }

        // 複数日程 && 最終日の場合
        if (this.tripDateTimes.length > 1 && index === this.tripDateTimes.length - 1) {
            addDestinationMoveTime = destinationFromMoveTime
            console.log(`複数日・最終日の出発に加算する値: ${addDepatureMoveTime} 到着に加算する値: ${addDestinationMoveTime}`)
        }

        const isEnableLunch = this._checkBookingDepatureEating(depaturesAt, addDepatureMoveTime)
        const isEnableDinner = this._checkBookingDestinationEating(destinationsAt, addDestinationMoveTime)

        console.log(isEnableLunch)
        console.log(isEnableDinner)

        return {
            isLunch: isEnableLunch,
            isDinner: isEnableDinner
        }
    }

    // 出発時間（移動時間と滞在時間を含む）と昼食予定時間が重なっているかを判定する
    private _checkBookingDepatureEating(depatureAt: string, moveTime?: number) {

        // 移動時間
        const moveTimeSecond = moveTime ?? this.BASE_MOVE_TIME;
        const moveAndStay = moveTimeSecond + 60 * 90

        const isEnable = isTimeOver(
            depatureAt, 
            "15:00",
            moveTimeSecond,
            60 * 90 
        );

        return { value: isEnable, startPeriod: "11:00", endPeriod: "15:00" }
    }

    private _checkBookingDestinationEating(destinationAt: string, moveTime?: number) {

        // 最終日の場合は、到着地への移動時間
        const moveTimeSecond = moveTime ?? this.BASE_MOVE_TIME;

        // 夕食の会場をでなければいけない時間
        const depatureFromEating = timeStringToSeconds(destinationAt) - moveTimeSecond;

        const isEnable = isExsistTimeRange(
            "17:00", 
            depatureFromEating,
            60 * 90
        );

        const timeToString = secondsToTimeString(depatureFromEating)
        console.log('到着時間', destinationAt)
        console.log(`変換前: ${depatureFromEating} 変換後: ${timeToString}`)

        return { value: isEnable, startPeriod: "17:00", endPeriod: timeToString }
    }

    private _getMustPassesNodeOnSingle(moveTime: number): Set<string> {

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
        
        const { isDinner, isLunch } = this._checkEatingCountOnMove(0, moveTime, moveTime)

        // 食事の時間があるかを確認する
        if (!isDinner.value && !isLunch.value) {
            return new Set(mustPassNodes);
        }

        // TODO: 残った時間分、食事スポットが回れるのであれは。食事スポットのIDを
        let eatingCount = 0;
        const DINNER: 'DINNER' | 'LUNCH' = 'DINNER';
        const LUNCH: 'DINNER' | 'LUNCH' = 'LUNCH';
        const baseTime = this.tripDateTimes[0].depaturesAt

        while (activeTime > 0) {
            if (eatingCount >= 2) break;

            if (activeTime >= this.EATING_TIME) {
                // COMMENT: 副作用の操作
                activeTime = activeTime - this.EATING_TIME;
                eatingCount++
                continue;
            }

            break;
        }

        if (eatingCount === 0) return new Set(mustPassNodes);

        if (isDinner.value && isLunch.value) {
            if (eatingCount === 1) {
                const [addSpot] = this._leftEatingNodes.splice(0, 1);
                const eatingSpot = {
                    id: addSpot.place_id,
                    type: DINNER,
                    startPeriod: isDinner.startPeriod,
                    endPeriod: isDinner.endPeriod
                }

                this._usedEatingSpots.push({
                    index: 0,
                    baseTime,
                    eatingSpots: [eatingSpot]
                })

                mustPassNodes.push(addSpot.place_id)
            }
            
            if (eatingCount === 2) {
                const [first, second] = this._leftEatingNodes.splice(0, 2);

                const lunchSpot = {
                    id: first.place_id,
                    type: LUNCH,
                    startPeriod: isLunch.startPeriod,
                    endPeriod: isLunch.endPeriod
                }

                const dinnerSpot = {
                    id: second.place_id,
                    type: DINNER,
                    startPeriod: isDinner.startPeriod,
                    endPeriod: isDinner.endPeriod
                }

                this._usedEatingSpots.push({
                    index: 0,
                    baseTime,
                    eatingSpots: [lunchSpot, dinnerSpot]
                })

                mustPassNodes.push(first.place_id, second.place_id)                
            }
        }

        if (isLunch.value && !isDinner.value) {
            if (eatingCount === 1 || eatingCount === 2) {
                const [addSpot] = this._leftEatingNodes.splice(0, 1);
                const eatingSpot = {
                    id: addSpot.place_id,
                    type: LUNCH,
                    startPeriod: isLunch.startPeriod,
                    endPeriod: isLunch.endPeriod
                }

                this._usedEatingSpots.push({
                    index: 0,
                    baseTime,
                    eatingSpots: [eatingSpot]
                })
                mustPassNodes.push(addSpot.place_id)
            }
        }

        if (!isLunch.value && isDinner.value) {
            if (eatingCount === 1 || eatingCount === 2) {
                const [addSpot] = this._leftEatingNodes.splice(0, 1);
                const eatingSpot = {
                    id: addSpot.place_id,
                    type: DINNER,
                    startPeriod: isDinner.startPeriod,
                    endPeriod: isDinner.endPeriod
                }

                this._usedEatingSpots.push({
                    index: 0,
                    baseTime,
                    eatingSpots: [eatingSpot]
                })
                mustPassNodes.push(addSpot.place_id)
            }
        }

        return new Set(mustPassNodes);
    }

    private _getMustPassesNodesOnMutiple(theme: string, moveTime: number): Set<string>[] {
        // 全体の活動時間 < MustSpotのトータルタイムなら例外スロー
        const totalActivaTimes = this.activeTimes.reduce((now, next) => now + next);
        let neededTimeMustSpot: SpotTotalTime[] = this._leftMustNodes.map(mustNode => {
            const stayTime = calcAverageStayTime(mustNode.types);

            const totalTime = stayTime + this.BASE_MOVE_TIME

            return {
                place_id: mustNode.place_id,
                types: mustNode.types,
                totalTime
            }
        })

        let mustSpotsTotalTime = this._calcSpotTotalTime(neededTimeMustSpot);

        if (totalActivaTimes < mustSpotsTotalTime) throw new Error("旅行日数が足りません");
        

        // 活動時間が長い日を抽出（起点）
        const sortedActiveTimes = [...this.activeTimes].map((time, index) => ({ index, activeTime: time })).sort((a,b) => (a.activeTime > b.activeTime ? -1: 1))

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
                const enableCount = this._checkSkipEatingWithKeyword(eatingCount, theme);
                memoMustSpot.push({ mustSpots: null, index: sortedActiveTimes[index].index, eatingCount: enableCount })
                continue;
            }

            // MustSpotsがまだ存在し、EatingCount * 2で回れれる場合
            if (totalMustTime + this.EATING_TIME * 2 < sortedActiveTimes[index].activeTime) {
                const isSkipEating = this._checkSkipEating(neededTimeMustSpot);
                memoMustSpot.push({ mustSpots: neededTimeMustSpot, index: sortedActiveTimes[index].index, eatingCount: isSkipEating? 1: 2 })
                
                // 全てのMUST SPOTを探索するため
                neededTimeMustSpot = [];
                continue;
            } 

            // MustSpotsがまだ存在し、EatingCount * 1で回れれる場合
            if (totalMustTime + this.EATING_TIME < sortedActiveTimes[index].activeTime) {
                const isSkipEating = this._checkSkipEating(neededTimeMustSpot);
                memoMustSpot.push({ mustSpots: neededTimeMustSpot, index: sortedActiveTimes[index].index, eatingCount: isSkipEating? 0: 1 })

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
                
                const isSkipEating = this._checkSkipEating(neededTimeMustSpot);
                memoMustSpot.push({ mustSpots: neededTimeMustSpot, index: sortedActiveTimes[index].index, eatingCount: isSkipEating ? 0: 1})
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

            const eatingSpots = this._enableEatingSpot(day.index, day.eatingCount, moveTime);

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
    public getMustPassesNodes(day: number, theme: string, moveTime: number): Set<string>[] {
        
        if (day <= 1) return [this._getMustPassesNodeOnSingle(moveTime)];

        if (day > 1) return this._getMustPassesNodesOnMutiple(theme, moveTime);

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

        if (usedEatingSpots.length === 0) {
            const none = { 'NONE': [[0, 0]] };
            return Array(tripDateTimes.length).fill(none);
        }
        
        // 一つずつ取り出し、以下の処理を行う
        // 条件1 eatingSpotsの数が0であれば、{['NONE': [[0,0]]]}を返す
        // 条件2 eatingSopotsの数が1であれば、keyをplace_id、calculateElapsedSeconds(activeTime, "17:00", "22:00")
        // 条件3 eatingSopotsの数が2であれば、keyをplace_id、calculateElapsedSeconds(activeTime, "11:00", "15:00") calculateElapsedSeconds(activeTime, "17:00", "22:00")

        // 出発時間と昼食予定時間が重なっている場合
        // 到着時間と夕食予定時間が重なっている場合

        const timeConstraints: TimeConstraints[] = usedEatingSpots.map((spot, index) => {
            let none = 'NONE'

            if (spot.eatingSpots.length <= 0) return {[none]: [[0, 0]]}

            const result: TimeConstraints = {};

            const lunch = spot.eatingSpots.find(eating => eating.type === 'LUNCH');
            const dinner = spot.eatingSpots.find(eating => eating.type === 'DINNER');

            if (lunch) {
                const { startElapsedSeconds, endElapsedSeconds } = calculateElapsedSeconds(spot.baseTime, lunch.startPeriod, lunch.endPeriod);
                result[lunch.id] = [[startElapsedSeconds, endElapsedSeconds]]
            }

            if (dinner) {
                const { startElapsedSeconds, endElapsedSeconds } = calculateElapsedSeconds(spot.baseTime, dinner.startPeriod, dinner.endPeriod);
                result[dinner.id] = [[startElapsedSeconds, endElapsedSeconds]]
            }

            if (Object.keys(result).length === 0) {
                result[none] = [[0, 0]]
            }

            return result
        })

        return timeConstraints
    }
}

export default ValidateRouteRule