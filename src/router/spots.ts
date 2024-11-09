import express, { NextFunction, Request, Response } from 'express';
import { PlaceType } from 'src/const/placeTypes';
import GPlacesRepo, { IFetchPlacePhotoRequestArgs } from 'src/repositories/gPlacesRepo';
import GRoutesMatrixRepo from 'src/repositories/gRoutesMatrixRepo';
import GRouteRepo from 'src/repositories/gRoutesRepo';
import { testNewGraph } from 'src/test/graph';
import { PhotoRequestParams, PhotoRequestQueryParams, Place, PlaceDetailRequestParams, PlaceDetailResponse, PlacePattern, v2PlanDetailResponse, v2ReqSpot, v2RoutesReq, v2SearchSpots } from 'src/types';
import BuiltGraph from 'src/usecase/builtGraph';
import CalcRoutes, { Constraints, TimeConstraints } from 'src/usecase/calcRoutes';
import { dijkstraWithEnd } from 'src/usecase/dijkstra';
import SearchRoutes from 'src/usecase/searchRoutes';
import ValidateTripRule from 'src/usecase/validateTripRule';
import GenerateCombineSpot, { generateRecommendedRoutes } from 'src/utils/combineSpots';
import { fetchSpotsViaV2TextSearch } from 'src/utils/extrack';
import sortedSpots from 'src/utils/sort';
// /api 以下のルーティング
export const apiRouter = express.Router();

apiRouter.post('/', async (req: Request<unknown, unknown, v2SearchSpots>, res: Response, next: NextFunction) => {

    // const reqBody = req.body

    // Condition
    const eating = "おすすめの食事";
    const recommend = "名所";
    const hotel = "温泉";

    // TODO: フロント側でareaの値を返す、無い場合はnull
    // const area = req.body.area ?? "山梨"
    const spots = req.body.spots;

    // 検索キーワードを生成する
    const recommendConditinos = req.body.condition?.wantedDo ?? ["おすすめ観光スポット"]

    try {

        // COMMENT: ルートの事前バリデーション


        // TOOD: 日数が3日未満なら以下のチェックを行う
        // TOOD: チェック処理
          // 1 出発地の緯度経度を調べる
          //   ・現在地の場合ここはスキップ
          //   ・文字列の場合、市区町村名までを含んだ文字列で緯度経度を調べる
          // 2 到着地、Spotの緯度経度でRoutes APIにリクエスト
          //   ・areaはある程度の実装が終わったら考える
          // 3 かかる時間が（1日の活動時間）×（旅行日数）< 60 × 60 × 4 × （旅行日数）かを計算
          // 4 エラーならこの時点でエラーレスポンスを返す
        const validate = new ValidateTripRule({ tripDateTimes: req.body.activeTimes });

        const gRouteRepo = new GRouteRepo();

        const isValid = await validate.isValidTripInfo({
            origin: req.body.depatureAt,
            destination: req.body.spots[0],
            depatureDate: req.body.date.depatureDay,
            returnedDate: req.body.date.returnDay,
            gRouteRepo
        })

        if (!isValid) throw new Error("この条件では旅行プランの生成ができません")
        // TODO: 旅行先の中心点を求める(現状はspotが中心 areaにも対応したい)
        // TODO: Routes APIで出発地から中心点までにかかる時間を算出する
        // ユーザーが食事について希望があればそのキーワードを元にSearch
        // デフォルトは「場所 おすすめの食事」

        // TODO: ユーザーのやりたいことに応じて、各キーワード毎にリクエストを発行する（上限3回）
        const gPlaceClient = new GPlacesRepo();

        const eatingSpots = await gPlaceClient.fetchEatingSpots({keyword: eating, spot: spots[0]});

        // const recommendSpots = await fetchSpotsViaV2TextSearch(recommend);
        const recommendAllSpots = await gPlaceClient.fetchAllRecommendSpots(recommendConditinos, spots[0]);

        // TODO: 楽天APIでもっと詳細な条件で検索できるようにする
        // TODO: キーワードの地名部分を動的にする
        const hotelSpots = await gPlaceClient.fetchHotelSpots(hotel, spots[0]);

        // それぞれのデータをソートする
        const sortClient = new sortedSpots();
        const sortedEatingSpots = sortClient.sortSpotsByRatings(eatingSpots)
        // const sortedRecommendSpots = sortClient.sortSpotsByRatings(recommendSpots)
        const sortedRecommendAllSpots = sortClient.sortMutipleSpotsByRating(recommendAllSpots)
        const sortedHotelSpots = sortClient.sortSpotsByRatings(hotelSpots)

        req.session.wantDo = recommendConditinos;
        req.session.recommends = sortedRecommendAllSpots

        // 複数通りの旅行プランを生成する
        const generatePatternSpots = new GenerateCombineSpot();
        // const combineSpots = generateRecommendedRoutes(sortedRecommendSpots, sortedEatingSpots, sortedHotelSpots)
        const newCombineSpots = generatePatternSpots.basedThemeCombineSpot(
            sortedRecommendAllSpots,
            sortedEatingSpots,
            sortedHotelSpots
        )

        const resultSpots: PlacePattern[] = newCombineSpots.map(newSpots => {
            const addPlaces = [...newSpots.places, ...spots];

            return {
                theme: newSpots.theme,
                places: addPlaces
            }
        })
        
        res.json({ 
            status: "success",
            data: {
                combineSpots: resultSpots
            }
         });

    } catch (error) {
        console.log("エラーが発生しました")
        console.log(error)
        next(error)
    }
    
});

apiRouter.get('/detail/:placeId', async (req: Request<PlaceDetailRequestParams>, res: Response<PlaceDetailResponse | {}>) => {
    const { placeId } = req.params;
    
    const gPlaceClient = new GPlacesRepo();
    const detailResponse = await gPlaceClient.fetchPlaceDetail(placeId);

    const result = detailResponse ? 
    {
        place_id: detailResponse.id,
        nationalPhoneNumber: detailResponse.nationalPhoneNumber,
        websiteUri: detailResponse.websiteUri,
        regularOpeningHours: detailResponse.regularOpeningHours,
        editorialSummary: detailResponse.editorialSummary,
        priceLevel: detailResponse.priceLevel
    }: {}

    return res.json(result)
})

apiRouter.get('/places/:placeId/photo/:photoId', async (req: Request<PhotoRequestParams, {}, {}, PhotoRequestQueryParams>, res: Response) => {
    const { photoId, placeId } = req.params;
    const { heightPx, widthPx } = req.query;

    if (!heightPx || !widthPx) {
        console.error("Width/Heightの情報は必須です")
        return res.sendStatus(404)
    }

    const numHeight = Number(heightPx);
    const numWidth = Number(widthPx);

    const gPlaceClient = new GPlacesRepo();

    const header: IFetchPlacePhotoRequestArgs = {
        photoId: photoId,
        maxHeightPx: numHeight,
        maxWidthPx: numWidth,
        skipHttpRedirect: true,
        place_id: placeId
    }

    const imgUrlObj = await gPlaceClient.fetchPhtoSingleUri(header)

    return res.json(imgUrlObj)
})

// TODO: Routesを生成するアルゴリズムを考える、設計する
// TODO: Routesを生成する関数を実装する
apiRouter.post("/routes", async (req: Request<unknown, unknown, v2RoutesReq>, res) => {
    try {
        
        // Google Maxtrix APIへのリクエスト
        const gMatrixRepo = new GRoutesMatrixRepo(req.body);
        const convertLocation = gMatrixRepo.convertLocationObj(req.body)

        const apiReqBody = gMatrixRepo.genBodyRequest({ locations: convertLocation})

        // console.log("リクエストボディ")
        // .dir(apiReqBody, { depth: null, colors: true })

        const response = await gMatrixRepo.requestRouteMatrix(apiReqBody);

        // Graphを構築
        const buildGraph = new BuiltGraph();
        // const distances = buildGraph.getDistance({ spots: gMatrixRepo.getOriginalSpots(), routes: response })
        const newDistance = buildGraph.getNewDistance({ spots: gMatrixRepo.getOriginalSpots(), routes: response })
        // const graph = buildGraph.buildGraph(distances);
        const newGraph = buildGraph.buildNewGraph(newDistance)

        // console.log("New Distance")
        // console.dir(newDistance, { depth: null, colors: true })

        // console.log("New Graph")
        // console.dir(newGraph, { depth: null, colors: true })

        const searchRoutes = new SearchRoutes(req.body);
        const origin = searchRoutes.getOriginId();
        const destination = searchRoutes.getDestinationHotelId();
        const mustWaypoints = searchRoutes.getMustWaypoint()
        const mustSpots = new Set(mustWaypoints);
        const timeConstrain = searchRoutes.createTimeConstraints();

        const constraints: Constraints = {
            maxTotalTime: 60 * 60 * 12,
            mustPassNodes: mustSpots,
            timeConstraints: timeConstrain
        }

        // TODO: 特定の時間帯にいなければならないスポットを動的に計算して取得する
        // COMMNET: 一旦固定値

        // COMENT: ルート計算用レポの呼び出し
        const calcClient = new CalcRoutes();
        const shortestPathWithCondition = calcClient.v2DfsfindShortestRoute(
            newGraph,
            origin,
            destination,
            constraints
        )

        // console.log("条件付きパス")
        // console.log(shortestPathWithCondition)

        const resultSpots = searchRoutes.convertPathToSpots({ path: shortestPathWithCondition });
        // console.log("スポット情報が入ったパス")
        // console.log(resultSpots)

        const resultPlan = searchRoutes.v2NewGraphConvertPlan({ spots: resultSpots, graph: newGraph })
        // console.log("最終的なプラン")
        // console.dir(resultPlan, { depth: null, colors: true })

        const responseFe: v2PlanDetailResponse = {
            basicInfo: {
                transportion: "CAR",
                startDay: "2024-07-16-08-00",
                endDay: "2024-07-16-22-00"
            },
            plan: resultPlan
        }


        // console.dir(responseFe)

        return res.json(responseFe)

        // COMMENT: 最短経路を導出する（とりあえず1回・条件を考えない）

        // COMMENT: レスポンスボディから始点と終点を取り出す（一旦出発地とホテルを取り出す）
        // const waypoints = searchRoutes.getAllWaypointsId();

        // COMMENT: 一旦すべてのスポット通る最短経路を導出する
        
        // const shortestPath = calcClient.findShortestPathWithConstraints(graph, origin, destination, waypoints)

        // console.log("最短経路")
        // console.log(shortestPath)

        // // TODO: 経路に対して、スポット情報を追加して返却する
        // const resultSpots = searchRoutes.convertPathToSpots(shortestPath);

        // console.log("最短経路")
        // console.log(resultSpots)

        // TODO: 滞在時間を一旦入れて、どの時間にどこにいるかをまとめたルート情報を返す
        // const resultPlan = searchRoutes.convertV2Plan({ spots: resultSpots, graph })

        // console.log("RESULT PLAN")
        // console.dir(resultPlan, { depth: null, colors: true })

        // return res.json({
        //     status: "ok",
        //     result: resultPlan
        // })
    } catch (error) {
        console.log(error)
        return res.json({
            status: "error"
        })
    }
})
