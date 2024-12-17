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
import { ApiError, ApiRateLimit, NotFoundRoutesError, NotFoundThemeError } from './error/CustomError';
import { checkSessionCount } from './middleware/checkApiLimit';
const app = express();
const port = process.env.PORT ? process.env.PORT: 8000;

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
            maxAge: 1000 * 60 * 60 * 12,
            sameSite: process.env.NODE_ENV === 'production'? "none" : "strict"
        },
        name: "chill_trip_id",
        unset: "destroy",
        rolling: true
    })
)
app.use('/api/v2/spots', apiRouter)

app.use(checkSessionCount)

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

            if (!place.photos || place.photos.length === 0 ) {
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
                    photoReference: "",
                }
            }
            
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
                    photoReference: "",
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

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {

    if (
        error instanceof NotFoundRoutesError ||
        error instanceof NotFoundThemeError
    ) {
        return res.status(422).json({ success: false, message: error.message });
    }

    if (error instanceof ApiError) {
        return res.status(501).json({ success: false, message: error.message })
    }

    if (error instanceof ApiRateLimit) {
        return res.status(403).json({ success: false, message: error.message })
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