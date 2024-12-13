import e from "express";
import express, { NextFunction, Request, Response } from "express";
import { Graph } from "redis";
import { convertJapaneseToType, PlaceType } from "src/const/placeTypes";
import { NotFoundRoutesError, NotFoundThemeError, ValidationError } from "src/error/CustomError";
import GPlacesRepo, { IFetchPlacePhotoRequestArgs } from "src/repositories/gPlacesRepo";
import GRoutesMatrixRepo from "src/repositories/gRoutesMatrixRepo";
import GRouteRepo from "src/repositories/gRoutesRepo";
import { testNewGraph } from "src/test/graph";
import {
  PhotoRequestParams,
  PhotoRequestQueryParams,
  Place,
  PlaceDetailRequestParams,
  PlaceDetailResponse,
  PlacePattern,
  SearchSpotsResponseBody,
  v2DayPlan,
  v2PlanDetailResponse,
  v2ReqSpot,
  v2RoutesReq,
  v2SearchSpots,
} from "src/types";
import BuiltGraph from "src/usecase/builtGraph";
import CalcRoutes, { Constraints, TimeConstraints } from "src/usecase/calcRoutes";
import { dijkstraWithEnd } from "src/usecase/dijkstra";
import SearchRoutes from "src/usecase/searchRoutes";
import ValidateRouteRule from "src/usecase/validateRouteRule";
import ValidateTripRule from "src/usecase/validateTripRule";
import GenerateCombineSpot, { generateRecommendedRoutes } from "src/utils/combineSpots";
import { calculateStayDuration } from "src/utils/dates";
import { fetchSpotsViaV2TextSearch } from "src/utils/extrack";
import sortedSpots from "src/utils/sort";
// /api 以下のルーティング
export const apiRouter = express.Router();

apiRouter.post(
  "/",
  async (req: Request<unknown, unknown, v2SearchSpots>, res: Response<SearchSpotsResponseBody>, next: NextFunction) => {
    // const reqBody = req.body

    // Condition
    const eating = "おすすめの食事";
    const recommend = "名所";
    const hotel = "温泉";

    // TODO: フロント側でareaの値を返す、無い場合はnull
    // const area = req.body.area ?? "山梨"
    const spots = req.body.spots;

    // 検索キーワードを生成する
    const recommendConditinos = req.body.condition?.wantedDo ?? ["おすすめ観光スポット"];

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
      const gPlacesRepo = new GPlacesRepo();

      const newOrigin = await validate.isValidTripInfo({
        origin: req.body.depatureAt,
        destination: req.body.spots[0],
        depatureDate: req.body.date.depatureDay,
        returnedDate: req.body.date.returnDay,
        gRouteRepo,
        gPlacesRepo,
        req
      });

      // TODO: 旅行先の中心点を求める(現状はspotが中心 areaにも対応したい)
      // TODO: Routes APIで出発地から中心点までにかかる時間を算出する
      // ユーザーが食事について希望があればそのキーワードを元にSearch
      // デフォルトは「場所 おすすめの食事」

      // TODO: ユーザーのやりたいことに応じて、各キーワード毎にリクエストを発行する（上限3回）
      const gPlaceClient = new GPlacesRepo();

      const eatingSpots = await gPlaceClient.fetchEatingSpots({ keyword: eating, spot: spots[0] });

      // const recommendSpots = await fetchSpotsViaV2TextSearch(recommend);
      // TODO: 旅行日数に応じて観光スポット数を変動させる
      const days = validate.getDays();
      const recommendAllSpots = await gPlaceClient.fetchAllRecommendSpots(recommendConditinos, spots[0], days);

      // TODO: 楽天APIでもっと詳細な条件で検索できるようにする
      // TODO: キーワードの地名部分を動的にする
      const hotelSpots = await gPlaceClient.fetchHotelSpots(hotel, spots[0]);

      // それぞれのデータをソートする
      const sortClient = new sortedSpots();
      const sortedEatingSpots = sortClient.sortSpotsByRatings(eatingSpots);
      // const sortedRecommendSpots = sortClient.sortSpotsByRatings(recommendSpots)
      const sortedRecommendAllSpots = sortClient.sortMutipleSpotsByRating(recommendAllSpots);
      const sortedHotelSpots = sortClient.sortSpotsByRatings(hotelSpots);

      // TODO: ここでsort済みかつテーマから削除したスポット情報をセッションへ保存する
      req.session.wantDo = recommendConditinos;
      req.session.wantedPlace = req.body.spots[0];

      // 複数通りの旅行プランを生成する
      const generatePatternSpots = new GenerateCombineSpot();
      // const combineSpots = generateRecommendedRoutes(sortedRecommendSpots, sortedEatingSpots, sortedHotelSpots)
      const newCombineSpots = generatePatternSpots.basedThemeCombineSpot(
        sortedRecommendAllSpots,
        sortedEatingSpots,
        sortedHotelSpots,
        req
      );

      const resultSpots: PlacePattern[] = newCombineSpots.map((newSpots) => {
        const addPlaces = [...newSpots.places, ...spots];

        return {
          theme: newSpots.theme,
          places: addPlaces,
        };
      });

      if (resultSpots.length < 1) throw new NotFoundThemeError('テーマの生成ができませんでした。条件を変えて検索してみてください。')

      res.json({
        combineSpots: resultSpots,
        origin: newOrigin,
        activeTimes: req.body.activeTimes,
        date: req.body.date,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        next(new NotFoundThemeError(error.message))
      }
      next(error);
    }
  }
);

apiRouter.get(
  "/detail/:placeId",
  async (req: Request<PlaceDetailRequestParams>, res: Response<PlaceDetailResponse | {}>) => {
    const { placeId } = req.params;

    const gPlaceClient = new GPlacesRepo();
    const detailResponse = await gPlaceClient.fetchPlaceDetail(placeId);

    const result = detailResponse
      ? {
          place_id: detailResponse.id,
          nationalPhoneNumber: detailResponse.nationalPhoneNumber,
          websiteUri: detailResponse.websiteUri,
          regularOpeningHours: detailResponse.regularOpeningHours,
          editorialSummary: detailResponse.editorialSummary,
          priceLevel: detailResponse.priceLevel,
        }
      : {};

    return res.json(result);
  }
);

apiRouter.get(
  "/places/:placeId/photo/:photoId",
  async (req: Request<PhotoRequestParams, {}, {}, PhotoRequestQueryParams>, res: Response) => {
    const { photoId, placeId } = req.params;
    const { heightPx, widthPx } = req.query;

    if (!heightPx || !widthPx) {
      console.error("Width/Heightの情報は必須です");
      return res.sendStatus(404);
    }

    const numHeight = Number(heightPx);
    const numWidth = Number(widthPx);

    const gPlaceClient = new GPlacesRepo();

    const header: IFetchPlacePhotoRequestArgs = {
      photoId: photoId,
      maxHeightPx: numHeight,
      maxWidthPx: numWidth,
      skipHttpRedirect: true,
      place_id: placeId,
    };

    const imgUrlObj = await gPlaceClient.fetchPhtoSingleUri(header);

    return res.json(imgUrlObj);
  }
);

// TODO: Routesを生成するアルゴリズムを考える、設計する
// TODO: Routesを生成する関数を実装する
apiRouter.post("/routes", async (req: Request<unknown, unknown, v2RoutesReq>, res: Response<v2PlanDetailResponse>, next: NextFunction) => {
  try {
    if (!req.session.eatingSpots) {
      throw new ValidationError("プランの生成に失敗しました。");
    }

    const eatingPlaces = req.body.waypoints.filter(spot => spot.types.includes(PlaceType.eating));
    const eatingSpots = [...req.session.eatingSpots, ...eatingPlaces];

    const validator = new ValidateRouteRule({
      tripDateTimes: req.body.activeTimes,
      spots: req.body.waypoints,
      eatingSpots: eatingSpots.concat(),
    });

    const { days } = calculateStayDuration(req.body.date.depatureDay, req.body.date.returnDay);

    // 出発地と目的地の移動時間を取得する
    const response = await GRoutesMatrixRepo.fetchMoveTime(req.body.originSpot, req.body.destinationSpot)
    const existRoutes = response.filter(route => route.duration !== '0s' && route.condition === "ROUTE_EXISTS")
    const moveTimes = existRoutes.map(route => {
      const numberStr = route.duration.slice(0, -1); // 末尾の1文字を削除
      const durationSec = parseInt(numberStr, 10);
      return durationSec
    })

    const mustPassNodes = validator.getMustPassesNodes(
      days, 
      convertJapaneseToType(req.body.theme), 
      req.session.originMoveDestination ?? moveTimes[0] ?? 60 * 90
    );
    const timeConstraints = validator.getTimeConstraints(req.body.activeTimes);
    const totalTimes = validator.getTotalActiveTimes();

    // console.log(mustPassNodes)
    // console.dir(timeConstraints, {depth: null, colors: true})

    // throw new Error("一旦停止");

    // 外部変数
    // グラフ
    // 各日毎のPath

    // 以下をループする
    // SearchRoutes.original_spots
    // waypointのID配列を保持する
    // グラフを生成する
    // Routeを生成する
    // waypointのID配列からルートで使用したPATH IDを削除する
    // 次回のEatingのIDを追加
    // 上記で足りない分だけ、recommendsから取得
    // 追加するPathをoriginal_spotsに追加する（この際型に合うようコンバートする）
    // 次のループへ

    const eatingKeys = Object.keys(timeConstraints[0]);
    const Eatings = req.body.waypoints.filter(spot => spot.types.includes(PlaceType.eating));
    const otherEatings = req.body.waypoints.filter(spot => !spot.types.includes(PlaceType.eating));
    const matchEatings = Eatings.filter(spot => eatingKeys.includes(spot.place_id));

    let routeOrigin = req.body.originSpot;
    let routeDestination = req.body.destinationSpot;
    let routeWaypoints = [...otherEatings, ...matchEatings];
    let resultPlan: v2DayPlan[] = [];
    const gPlaceClient = new GPlacesRepo();

    for (let i = 0; i < days; i++) {
      // origin / destinationを生成する

      // 日帰りの場合
      if (days === 1) {
        routeDestination = req.body.originSpot
      }

      // 最終日は反転
      if (days > 1 && i === days - 1) {
        routeOrigin = req.body.destinationSpot;
        routeDestination = req.body.originSpot;
      }

      // 途中日はHotelから
      if (0 < i && days - 1 > i) {
        routeOrigin = req.body.destinationSpot;
        routeDestination = req.body.destinationSpot;
      }

      // ここでMatrix Routesをインスタン化
      const gMatrixRepo = new GRoutesMatrixRepo({
        origin: routeOrigin,
        waypoints: routeWaypoints,
        destination: routeDestination,
      });

      const convertLocation = gMatrixRepo.convertLocationObj({
        origin: routeOrigin,
        waypoints: routeWaypoints,
        destination: routeDestination,
      });

      const apiReqBody = gMatrixRepo.genBodyRequest({ locations: convertLocation });
      const response = await gMatrixRepo.requestRouteMatrix(apiReqBody);

      // Graphを構築
      const buildGraph = new BuiltGraph();
      // const distances = buildGraph.getDistance({ spots: gMatrixRepo.getOriginalSpots(), routes: response })
      const newDistance = buildGraph.getNewDistance({ spots: gMatrixRepo.getOriginalSpots(), routes: response });
      // const graph = buildGraph.buildGraph(distances);
      const newGraph = buildGraph.buildNewGraph(newDistance);

      const calcClient = new CalcRoutes();

      const constraints: Constraints = {
        mustPassNodes: mustPassNodes[i],
        timeConstraints: timeConstraints[i],
        maxTotalTime: totalTimes[i],
      };

      if (i == 0) {
        // console.dir(newGraph, {depth: null, colors: true})
      //   console.log(`${i}番目のループ`)
      //   console.log(routeOrigin.place_id)
      //   console.log(routeDestination.place_id)
      //   console.log(routeWaypoints.map(spot => spot.place_id));
        // console.log(routeWaypoints.filter(spot => spot.types.includes(PlaceType.eating)).map(spot => spot.place_id))
  
      //   console.log('Graph Keys')
        // const keys = Object.keys(newGraph)
        // console.log(keys)
        // console.dir(constraints, {depth: null, colors: true});
      }

      const isRecrusion = (0 < i && days - 1 > i) || days === 1;

      const shortestPathWithCondition = calcClient.v2DfsfindShortestRoute(
        newGraph,
        routeOrigin.place_id,
        routeDestination.place_id,
        constraints,
        convertJapaneseToType(req.body.theme),
        isRecrusion
      );

      const searchRoutes = new SearchRoutes({
        origin: routeOrigin,
        waypoints: routeWaypoints,
        destination: routeDestination,
      });

      const resultSpots = searchRoutes.convertPathToSpots({ path: shortestPathWithCondition });
      // console.log("スポット情報が入ったパス")
      // console.log(resultSpots)

      const resultDayPlan = searchRoutes.v2NewGraphConvertPlan({ spots: resultSpots, graph: newGraph });
      resultPlan.push(resultDayPlan);

      // 次回ループ時に向けたデータの更新
      if (i !== days - 1) {
        // IDを削除する
        //  この部分でなぜか取り除くIDが少ない
        const originalWaypoints = searchRoutes.getAllWaypointsId();
        const leftWaypoints = shortestPathWithCondition.filter((node) => {
          if (node === routeOrigin.place_id) {
            return false;
          }
          if (node === routeDestination.place_id) {
            return false;
          }
          if (originalWaypoints.includes(node)) {
            return false;
          }

          return true;
        });

        let deletedCount = originalWaypoints.length - leftWaypoints.length;

        // 次の制約条件を取り出す必要がある
        const eatingSpotIds = Object.keys(timeConstraints[i + 1]);
        // const test = eatingSpots.map(spot => spot.place_id);

        const addEatingSpots = eatingSpotIds.map((id) => {
          const spot = eatingSpots.find((original) => original.place_id === id);
          return spot;
        }).filter(spot => spot !== undefined);

        deletedCount = deletedCount - addEatingSpots.length + 2;

        // recommendから取得
        let addRecommendsSpot = req.session.recommends?.find((recommend) => recommend.theme === req.body.theme);

        if (!addRecommendsSpot) {
          console.log('レコメンド情報がセッションにありません')
          throw new ValidationError("レコメンド情報がセッションにありません");  
        }

        const splitTheme = addRecommendsSpot.theme.split('/');

        // 足りない場合、セッションへ追加する
        if (addRecommendsSpot.spots.length < deletedCount) {
            // TODO: 足りない場合追加する処理
            const mustSpots = searchRoutes.getMustSpots();
            const response = await gPlaceClient.fetchAddRecommendSpots({  
              theme: splitTheme,
              nextPage: addRecommendsSpot.nextPage? addRecommendsSpot.nextPage: undefined,
              days: splitTheme.length > 1 ? 1 : days,
              spot: mustSpots[0]
            })

            const combineClient = new GenerateCombineSpot();
            const savedSession = combineClient.saveSession(addRecommendsSpot, response, req);

            // addRecommendsSpotをセッションから取り出したもので更新する
            addRecommendsSpot = req.session.recommends?.find((recommend) => recommend.theme === req.body.theme)

            if (!addRecommendsSpot) {
              console.log('セッションに保存したレコメンド情報の取得に失敗しました。')
              addRecommendsSpot = savedSession
            }
        }

        const addRecommends: v2ReqSpot[] = addRecommendsSpot?.spots.splice(0, deletedCount);

        const newWaypoints = [...addEatingSpots, ...addRecommends];

        // Waypointsの更新
        routeWaypoints = newWaypoints;
      }
    }

    if (resultPlan.length < 1) throw new NotFoundRoutesError('ルート生成に失敗しました')

    const result: v2PlanDetailResponse = {
      basicInfo: {
            transportion: "CAR",
            startDay: req.body.date.depatureDay,
            endDay: req.body.date.returnDay,
          },
      plan: [...resultPlan]
    }

    return res.json(result)

  } catch (error) {
    console.log(error);
    next(error)
  }
});
