import express, { NextFunction } from 'express';
import cors from 'cors'
import { Request, Response } from 'express';
import 'dotenv/config'
import { Client, FindPlaceFromTextRequest, PlacePhotoRequest, Language, LatLngLiteral, PlaceInputType, PlacesNearbyRequest, TextSearchRequest, PlaceData, GeocodeRequest, DirectionsRequest, TravelMode, PlacesNearbyRanking } from "@googlemaps/google-maps-services-js";
import { ConvertSpot, DayPlan, Photo, PhotosRequestBody, PhotosResponseBody, PlacesResponse, PlanDetailsResponse, PlanRequestBody, Route, Spot, SpotCard, SpotType, TrafficCard, TrafficRoute, v2ReqSpot } from './types';
import axios from 'axios';
import { calcNextDate, convertRoutes, convertSpots } from './utils/convertRoutes';
import { createDirectionRequest } from './utils/fetch';
import { apiRouter } from './router/spots';
import GPlacesRepo, { IFetchPlacePhotoRequestArgs } from './repositories/gPlacesRepo';
import redisClient from './lib/redis';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { ApiError, NotFoundRoutesError, NotFoundThemeError } from './error/CustomError';
const app = express();
const port = 8000;

// COMMENT: Redisとの接続処理
redisClient.connect().then(() => console.log("Redisに接続")).catch((e) => console.error("Redisへの接続が失敗しました。" + e))

app.use(express.json())
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], //アクセス許可するオリジン
    credentials: true, //レスポンスヘッダーにAccess-Control-Allow-Credentials追加
    optionsSuccessStatus: 200 //レスポンスstatusを200に設定
}))

app.use(
    session({
        store: new RedisStore({ client: redisClient }),
        secret: process.env.SECRET_KEY ?? "test-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 1000 * 60 * 60,
            sameSite: "strict"
        },
        name: "chill_trip_id",
        unset: "destroy",
        rolling: true
    })
)
app.use('/api/v2/spots', apiRouter)

// 定数系
const client = new Client({});
const MIN_SPOTS_PER_DAY = 3
const GoogleApiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY : ""

app.get('/api/spots', async (req: Request, res: Response) => {

    if (req.query === undefined || req.query.keyword === undefined)  { 
        return res.status(400).json({error: "クエリがありません。"})
    }

    console.log("Execute")
    const query = req.query ? String(req.query.keyword) : ""
    const gPlacesRepo = new GPlacesRepo()


    try {
        const result = await gPlacesRepo.searchPlacesWithKeyword(query);

        const requestPromise: Promise<v2ReqSpot>[] = result.places.map(async place => {
            const photoId = place.photos[0]?.name.split("/").pop();

            if (!photoId) {
                return {
                    place_id: place.id,
                    spotName: place.displayName.text,
                    spotImgSrc: "",
                    spotImgAlt: "",
                    location: place.location,
                    types: place.types,
                    rating: place.rating,
                    userRatingCount: place.userRatingCount,
                    formattedAddress: place.formattedAddress,
                    photoReference: place.photos[0],
                }
            }

            const requestHeader: IFetchPlacePhotoRequestArgs = {
                photoId: photoId,
                maxHeightPx: place.photos[0].heightPx ?? 100,
                maxWidthPx: place.photos[0].widthPx ?? 200,
                skipHttpRedirect: true,
                place_id: place.id
            }

            const request = await gPlacesRepo.fetchPhtoSingleUri(requestHeader);

            return {
                place_id: place.id,
                spotName: place.displayName.text,
                spotImgSrc: request.photoUri ?? "",
                spotImgAlt: "",
                location: place.location,
                types: place.types,
                rating: place.rating,
                userRatingCount: place.userRatingCount,
                formattedAddress: place.formattedAddress,
                photoReference: place.photos[0],
            }
        })

        const response = await Promise.all(requestPromise);
        return res.json(response)

    } catch (error) {
        console.log(error)
        res.status(400).json({ message: "Error" })
    } finally {
        // res.json({status: "pre-success", query: query})
    }
});
//     const query = req.query ? String(req.query.keyword) : ""

//     const Lating: LatLngLiteral = {
//         lat: 35.710245589702794,
//         lng: 139.81067894762728
//     }

//     const searchPlaceRequest: TextSearchRequest = {
//         params: {
//             query: query,
//             location: Lating,
//             radius: 10000,
//             language: Language.ja,
//             key: GoogleApiKey
//         }
//     }


//     try {
//         const result = await client.textSearch(searchPlaceRequest)

//         const promiseSpots: Promise<Spot>[] = result.data.results.map(async (spot) => {
//             if (spot.name !== undefined && spot.photos !== undefined && spot.place_id !== undefined) {

//                 const photoRequest = {
//                     params: {
//                         photoreference: spot.photos[0].photo_reference,
//                         maxwidth: 300,
//                         key: GoogleApiKey,
//                     },
//                 }
//                 const imgSrc = await axios.get(
//                     `https://maps.googleapis.com/maps/api/place/photo?photoreference=${photoRequest.params.photoreference}&maxwidth=${photoRequest.params.maxwidth}&key=${photoRequest.params.key}`
//                 )

//                 return {
//                     id: spot.place_id,
//                     spotName: spot.name,
//                     spotImgSrc: imgSrc.request.res.responseUrl,
//                     spotImgAlt: spot.name
//                 }
//             }

//             return {
//                 id: "",
//                 spotName: "",
//                 spotImgSrc: "",
//                 spotImgAlt: ""
//             }
//         })

//         const resultSpots: Spot[] = await Promise.all(promiseSpots)

//         res.json(resultSpots)

//     } catch (error) {
//         console.log(error)
//         res.status(400).json({ message: error })
//     } finally {
//         // res.json({status: "pre-success", query: query})
//     }
// });

app.post('/api/plans', async (req: Request<unknown, unknown, PlanRequestBody>, res) => {
    // 観光スポット情報と宿泊日数を参照し、少ないか同か判定

    const { basicInfo, spots, purposes } = req.body
    const { startDay, endDay, transportion } = basicInfo

    // 旅行期間の計算
    const tripDays: number = (new Date(endDay).getTime() - new Date(startDay).getTime()) / 86400000 + 1

    if (tripDays <= 1 ) {

    }

    // 初日の出発地を取り除く
    const originSpot = spots.shift()

    // spotsをタイプ別の配列に分割

    // スポット数と旅行期間の比較
    const moreSpots: number = spots.length < MIN_SPOTS_PER_DAY*tripDays? MIN_SPOTS_PER_DAY*tripDays - spots.length: 0
    
    // 緯度経度の取得(placeIDを元に検索)
    const geocodeRequest: GeocodeRequest = {
        params: {
            place_id: moreSpots > 0? spots[0].id : "",
            key: GoogleApiKey
        }
    }

    try {
        const geocodeResponse = await client.geocode(geocodeRequest)
        // console.log(geocodeResponse.data.results[0].geometry.location)

        // TextSearchのリクエスト発行・取得
        const Lating: LatLngLiteral = geocodeResponse.data.results[0].geometry.location
    
        // スポット別の検索が必要
        // 加えて、目的に応じたスポット検索も必要
        const searchPlaceRequest: PlacesNearbyRequest = {
            params: {
                keyword: purposes[0],
                location: Lating,
                radius: 10000,
                rankby: PlacesNearbyRanking.prominence,
                language: Language.ja,
                key: GoogleApiKey
            }
        }

        const spotsResponse = await client.placesNearby(searchPlaceRequest)
        // console.log(spotsResponse.data.results)

        // spotsResponseをspotに整形して、spotsに加える
        for (let i = 0; i < moreSpots; i++) {
            const tempSpot = spotsResponse.data.results[i]
            if (tempSpot.place_id && tempSpot.name && tempSpot.geometry && tempSpot.types &&tempSpot.photos ) {
                const spot: Spot = {
                    id: tempSpot.place_id,
                    spotName: tempSpot.name,
                    spotImgAlt: tempSpot.name,
                    spotImgSrc: "",
                    photoReference: tempSpot.photos[0].photo_reference,
                    location: tempSpot.geometry.location,
                    type: tempSpot.types
                }

                spots.push(spot)
            }
        }
        // console.log(spots)

        const convSpots = convertSpots(spots, MIN_SPOTS_PER_DAY)

        if (originSpot === undefined) throw new Error("No Origin!!!")
        const plan = []

        if (convSpots.length <= 1) {
            const directionRequest = createDirectionRequest(GoogleApiKey, basicInfo, originSpot, originSpot, convSpots[0])
            const directionResponse = await client.directions(directionRequest)
            const wayPointRoute = convertRoutes(directionResponse, basicInfo.startDay, spots, originSpot, originSpot)
            const dayplan: DayPlan = {Routes: wayPointRoute}

            plan.push(dayplan)
        } else {
            for (let i = 0; i < convSpots.length; i++) {

                if (i === 0) {
                    const directionRequest = createDirectionRequest(GoogleApiKey, basicInfo, originSpot, convSpots[i][convSpots[i].length - 1], convSpots[i])
                    const directionResponse = await client.directions(directionRequest)
                    const wayPointRoute = convertRoutes(directionResponse, basicInfo.startDay, spots, originSpot, convSpots[i][convSpots[i].length - 1])
                    const dayplan: DayPlan = {Routes: wayPointRoute}

                    plan.push(dayplan)
                    continue
                    
                } else if (i === convSpots.length - 1) {
                    const directionRequest = createDirectionRequest(GoogleApiKey, basicInfo, convSpots[i][0], originSpot, convSpots[i])
                    const directionResponse = await client.directions(directionRequest)
                    const dayDepartureAt = calcNextDate(basicInfo.startDay, i)
                    const wayPointRoute = convertRoutes(directionResponse, dayDepartureAt, spots, convSpots[i][0], originSpot)
                    const dayplan: DayPlan = {Routes: wayPointRoute}

                    plan.push(dayplan)  
                    break 
                }
                
                const directionRequest = createDirectionRequest(GoogleApiKey, basicInfo, convSpots[i][0], convSpots[i][convSpots[i].length - 1], convSpots[i])
                const directionResponse = await client.directions(directionRequest)
                const dayDepartureAt = calcNextDate(basicInfo.startDay, i)
                const wayPointRoute = convertRoutes(directionResponse, dayDepartureAt, spots, convSpots[i][0], convSpots[i][convSpots[i].length - 1])
                const dayplan: DayPlan = {Routes: wayPointRoute}

                plan.push(dayplan)
            }
        }

        // //　以下のオブジェクトができている
        // const sample = {
        //     "日付": [],
        //     "日付２": [],
        // }

        // // Direction APIのリクエストを作成する（１日だけ）
        // if (originSpot === undefined) throw new Error("No Origin!!!")

        // const directionRequest: DirectionsRequest = {
        //     params: {
        //         origin: originSpot.location,
        //         destination: originSpot.location,
        //         waypoints: [],
        //         mode: basicInfo.transportion === "CAR"? TravelMode.driving: TravelMode.transit,
        //         optimize: true,
        //         region: "ja", 
        //         key: GoogleApiKey,
        //     }
        // } 
        
        // for (let i = 0;  i < spots.length; i++) {
        //     // if ( i == spots.length - 1) continue
        //     directionRequest.params.waypoints?.push(spots[i].location)
        // }

        // console.log("Example direction api request!!")
        // console.log(directionRequest.params)

        // const directionResponse = await client.directions(directionRequest)
        // const wayPointRoutes = convertRoutes(directionResponse, basicInfo, spots, originSpot, originSpot)

        // // 定数化
        // const legs = directionResponse.data.routes[0].legs

        // // ルート間の経過時間を返す
        // const routesDuration: number[] = legs.map((leg) => leg.duration.value * 1000)

        // console.log(routesDuration)

        // // ルート情報を整形する
        // const wayPointRoutes: Route[] = []

        // for (let i=0; i<legs.length; i++) {
            
        //     // 初回の処理
        //     if (i == 0) {
        //         console.log("First Execute!!")
        //         // 出発時間の生成
        //         const departure_date = new Date(basicInfo.startDay)
        //         departure_date.setHours(departure_date.getHours() + 8)

        //         const departure_year = departure_date.getFullYear();
        //         const departure_month = String(departure_date.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
        //         const departure_day = String(departure_date.getDate()).padStart(2, '0');
        //         const departure_hour = String(departure_date.getHours()).padStart(2, '0');
        //         const departure_minute = String(departure_date.getMinutes()).padStart(2, '0');

        //         // Spotcardの追加
        //         const responseDepartureSpot: SpotCard = {
        //             category: "SPOT",
        //             spot: originSpot,
        //             type: "DEPARTURE",
        //             departure_at: `${departure_year}-${departure_month}-${departure_day}-${departure_hour}-${departure_minute}`,
        //             arrived_at: ""
        //         }
        //         wayPointRoutes.push(responseDepartureSpot)

        //         // 到着時間の生成
        //         const arrived_at = new Date(departure_date.getTime() + routesDuration[0])
        //         console.log(arrived_at)

        //         // String型に整形
        //         const year = arrived_at.getFullYear();
        //         const month = String(arrived_at.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
        //         const day = String(arrived_at.getDate()).padStart(2, '0');
        //         const hour = String(arrived_at.getHours()).padStart(2, '0');
        //         const minute = String(arrived_at.getMinutes()).padStart(2, '0');

        //         const route: TrafficRoute = {
        //             way: "CAR",
        //             departure: `${departure_year}-${departure_month}-${departure_day}-${departure_hour}-${departure_minute}`,
        //             arrive: `${year}-${month}-${day}-${hour}-${minute}`
        //         } 

        //         const trafficCard: TrafficCard = {
        //             category: "TRAFFIC",
        //             routes: [route]
        //         }

        //         wayPointRoutes.push(trafficCard)
        //         continue
        //     }

        //     // 最後の処理
        //     if (i == legs.length - 1) {
        //         console.log("Final Execute!!")

        //         // 該当スポットの取得
        //         const index = directionResponse.data.routes[0].waypoint_order[i - 1]
        //         const spot: Spot = spots[index]

        //         // 先のスポットから現在地に到着する時間の取得
        //         const wayPoint = wayPointRoutes[i * 2 - 1]
        //         const arrived_at = wayPoint.category === "SPOT"? wayPoint.arrived_at : wayPoint.routes[0].arrive

        //         // タイプの変換
        //         const type = spot.type.includes("restaurant") ? "EATING": "WAYPOINT"

                
        //         // 現在地を出発する時間
        //         const stayTime = type === "EATING"? 1 : 2
        //         const tempArry = arrived_at.split("-")
        //         const departure_at = new Date(Number(tempArry[0]), Number(tempArry[1]) - 1, Number(tempArry[2]), Number(tempArry[3]), Number(tempArry[4]))
        //         departure_at.setHours(departure_at.getHours() + stayTime)

        //         // String型に整形
        //         const year = departure_at.getFullYear();
        //         const month = String(departure_at.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
        //         const day = String(departure_at.getDate()).padStart(2, '0');
        //         const hour = String(departure_at.getHours()).padStart(2, '0');
        //         const minute = String(departure_at.getMinutes()).padStart(2, '0');

        //         // SpotCardの生成・追加
        //         const SpotCard: SpotCard = {
        //             category: "SPOT",
        //             spot: spot,
        //             arrived_at: arrived_at,
        //             departure_at: `${year}-${month}-${day}-${hour}-${minute}`,
        //             type: type
        //         }

        //         wayPointRoutes.push(SpotCard)


        //         // TrafficCardの追加

        //         const arrive_at_destination = new Date(new Date(departure_at).getTime() + routesDuration[i])

        //         // String型に整形
        //         const arrive_at_destination_year = arrive_at_destination.getFullYear();
        //         const arrive_at_destination_month = String(arrive_at_destination.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
        //         const arrive_at_destination_day = String(arrive_at_destination.getDate()).padStart(2, '0');
        //         const arrive_at_destination_hour = String(arrive_at_destination.getHours()).padStart(2, '0');
        //         const arrive_at_destination_minute = String(arrive_at_destination.getMinutes()).padStart(2, '0');

        //         const route: TrafficRoute = {
        //             way: "CAR",
        //             departure:  `${year}-${month}-${day}-${hour}-${minute}`,
        //             arrive: `${arrive_at_destination_year}-${arrive_at_destination_month}-${arrive_at_destination_day}-${arrive_at_destination_hour}-${arrive_at_destination_minute}`
        //         } 

        //         const TrafficCard: TrafficCard = {
        //             category: "TRAFFIC",
        //             routes: [route]
        //         }

        //         wayPointRoutes.push(TrafficCard)

        //         // 目的地の追加
        //         const responseDestinationSpot: SpotCard = {
        //             category: "SPOT",
        //             spot: originSpot,
        //             type: "DESTINATION",
        //             departure_at: "",
        //             arrived_at: `${arrive_at_destination_year}-${arrive_at_destination_month}-${arrive_at_destination_day}-${arrive_at_destination_hour}-${arrive_at_destination_minute}`
        //         }

        //         wayPointRoutes.push(responseDestinationSpot)
        //         break
        //     }

        //     // 通常時の処理

        //     // SpotCardの追加
        //     const index = directionResponse.data.routes[0].waypoint_order[i - 1]
        //     const spot: Spot = spots[index]

        //     // 先のスポットから現在地に到着する時間の取得
        //     const wayPoint = wayPointRoutes[i * 2 - 1]
        //     console.log(`${i} Turn Execute!!`)

        //     const arrived_at = wayPoint.category === "SPOT"? wayPoint.arrived_at : wayPoint.routes[0].arrive

        //     // タイプの変換
        //     const type = spot.type.includes("restaurant") ? "EATING": "WAYPOINT"

                
        //     // 現在地を出発する時間
        //     const stayTime = type === "EATING"? 1: 2
        //     const tempArry = arrived_at.split("-")
        //     const departure_at = new Date(Number(tempArry[0]), Number(tempArry[1]) - 1, Number(tempArry[2]), Number(tempArry[3]), Number(tempArry[4]))
        //     departure_at.setHours(departure_at.getHours() + stayTime)

        //     // String型に整形
        //     const year = departure_at.getFullYear();
        //     const month = String(departure_at.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
        //     const day = String(departure_at.getDate()).padStart(2, '0');
        //     const hour = String(departure_at.getHours()).padStart(2, '0');
        //     const minute = String(departure_at.getMinutes()).padStart(2, '0');

        //     // SpotCardの生成・追加
        //     const SpotCard: SpotCard = {
        //         category: "SPOT",
        //         spot: spot,
        //         arrived_at: arrived_at,
        //         departure_at: `${year}-${month}-${day}-${hour}-${minute}`,
        //         type: type
        //     }

        //     wayPointRoutes.push(SpotCard)

        //     // TrafficCardの追加
        //     const arrive_at_destination = new Date(new Date(departure_at).getTime() + routesDuration[i])
        //     console.log(routesDuration[i])

        //     // String型に整形
        //     const arrive_at_destination_year = arrive_at_destination.getFullYear();
        //     const arrive_at_destination_month = String(arrive_at_destination.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1し、2桁表示にする
        //     const arrive_at_destination_day = String(arrive_at_destination.getDate()).padStart(2, '0');
        //     const arrive_at_destination_hour = String(arrive_at_destination.getHours()).padStart(2, '0');
        //     const arrive_at_destination_minute = String(arrive_at_destination.getMinutes()).padStart(2, '0');

        //     const route: TrafficRoute = {
        //         way: "CAR",
        //         departure:  `${year}-${month}-${day}-${hour}-${minute}`,
        //         arrive: `${arrive_at_destination_year}-${arrive_at_destination_month}-${arrive_at_destination_day}-${arrive_at_destination_hour}-${arrive_at_destination_minute}`
        //     } 

        //     const TrafficCard: TrafficCard = {
        //         category: "TRAFFIC",
        //         routes: [route]
        //     }

        //     wayPointRoutes.push(TrafficCard)
        // }

        console.log("Final Create Response")
        console.log(plan)
        const response: PlanDetailsResponse = {
            basicInfo: basicInfo,
            plan: plan
        }
        res.json(response)
    } catch (error) {
        console.log(error)
    }
})

app.post("/api/spots/photos", async (req: Request<unknown, unknown, PhotosRequestBody>, res: Response<PhotosResponseBody>) => {
    const photosReferences = req.body

    const photos: Promise<Photo>[] = photosReferences.referenses.map(async (reference) => {
        try {

            const photo = await axios.get(
                `https://maps.googleapis.com/maps/api/place/photo?photoreference=${reference.photoReference}&maxwidth=${300}&key=${GoogleApiKey}`
            )
    
            return {
                id: reference.id,
                spotImgSrc: photo.request.res.responseUrl
            }
            
        } catch (error) {
            throw new Error("failed get photo")
        }
    })

    const response = await Promise.all(photos)
    res.json({ photos: response })
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {

    if (
        error instanceof NotFoundRoutesError ||
        error instanceof NotFoundThemeError
    ) {
        return res.status(422).json({ success: false, message: error.message });
    }

    if (error instanceof ApiError) {
        return res.status(500).json({ success: false, message: error.message })
    }

    // 特定のエラータイプに応じてカスタム処理
    if (error.name === 'NotFoundError') {
        return res.status(404).json({ success: false, message: 'Resource not found' });
    } else if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
    } else {
        // デフォルトの500エラー
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));