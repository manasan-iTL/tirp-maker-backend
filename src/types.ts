import { LatLng, LatLngLiteral }  from "@googlemaps/google-maps-services-js";
import { TripDateTime } from "./usecase/validateTripRule";

export type Spot = {
    id: string;
    spotName: string;
    spotImgSrc: string;
    spotImgAlt: string;
    location: LatLng;
    type: string[];
    photoReference?: string;
}

export type ConvertSpot = {
    name: string;
    photoReference: string
}

export type PlanRequestBody = {
    // 基本情報（宿泊日、交通手段、観光スポット）
    spots: Spot[],
    basicInfo: BasicInfo,
    purposes: string[],
    area: string[]
}

export type PhotosRequestBody = {
    referenses: photoReference[]
}

export type SearchSpotsResponseBody = {
    combineSpots: PlacePattern[],
    origin: v2ReqSpot,
    activeTimes: TripDateTime[],
    date: {
        depatureDay: string,
        returnDay: string,
    },
}

export type PhotosResponseBody = {
    photos: Photo[]
}

export type PlanDetailsResponse = {
    // 基本情報（交通手段、宿泊日）
    // ルート情報→１日ごとのルート→個々のスポット情報（出発地、目的地＝１枚、食事＝１枚以上、）
    basicInfo: BasicInfo,
    plan: Plan
}

export type BasicInfo = {
    transportion: "CAR" | "PUBLIC",
    startDay: string,
    endDay: string,
}

export type Plan = DayPlan[]

export type DayPlan = {
    Routes: Route[],
}

export type Route = SpotCard | TrafficCard

export type SpotCard = {
    category: "SPOT",
    spot: Spot,
    arrived_at: string,
    departure_at: string,
    type: SpotType
}

export type TrafficCard = {
    category: "TRAFFIC",
    routes: TrafficRoute[]
}

export type TrafficRoute = {
    way: "WALKING" | "TRAIN" | "CAR" | "BUS",
    departure: string,
    arrive: string
}

// EATINGの判定は,typesで'restaurant', 'food'だった場合
export type SpotType = "DEPARTURE" | "DESTINATION" | "EATING" | "WAYPOINT"

type Card = "TRAFFIC"

type photoReference = {
    id: string;
    photoReference: string;
}

export type Photo = {
    id: string;
    spotImgSrc: string;
}

/*
    v2用の型
*/

export type v2ReqSpot = {
    place_id: string,
    spotName: string;
    spotImgSrc: string;
    spotImgAlt: string;
    location: { latitude: number, longitude: number}
    rating: number;
    userRatingCount: number;
    types: string[];
    formattedAddress: string,
    photoReference: v2GPhoto | string;
}

export type v2SearchSpots = {
    spots: v2ReqSpot[],
    area?: string,
    depatureAt: v2ReqSpot,
    date: {
        depatureDay: string,
        returnDay: string,
    },
    activeTimes: TripDateTime[],
    transitWay: 'CAR' | 'train',
    condition?: Condition
}

export type v2RoutesReq = {
    originSpot: v2ReqSpot,
    waypoints: v2ReqSpot[],
    destinationSpot: v2ReqSpot,
    activeTimes: TripDateTime[],
    date: {
        depatureDay: string,
        returnDay: string,
    },
    theme: string
}

type Condition = {
    eating: string[],
    wantedDo: string[],
    hotel: string[]
}

export type v2PlanDetailResponse = {
    basicInfo: BasicInfo,
    plan: v2Plan
}

export type v2Plan = v2DayPlan[]

export type v2DayPlan = {
    Routes: v2Route[],
}

export type v2Route = v2SpotCard | TrafficCard

export type v2SpotCard = {
    category: "SPOT",
    spot: v2ReqSpot,
    arrived_at: string,
    departure_at: string,
    type: SpotType
}


/**
 * 
 
    APIのリクエストとレスポンスの型

 */

export interface PhotoRequestParams {
    photoId: string,
    placeId: string
}

export interface PhotoRequestQueryParams {
    heightPx?:  string,
    widthPx?: string
}

export interface PlaceDetailRequestParams {
    placeId: string
}

export interface PlaceDetailResponse {
    place_id: string,
    nationalPhoneNumber: string,
    websiteUri: string,
    regularOpeningHours: RegularOpeningHours,
    priceLevel: PriceLevel,
    editorialSummary: {
        text: string;
        languageCode: string
    },
    userRatingCount: number;
}

/**

Google Places APiの型定義

 */

export type PlacesResponse = {
    places: Place[],
    nextPageToken?: string
}

export type PlacesLocation = {
    places: LocationPlace[]
}

type v2GPhoto = {
    name: string,
    widthPx: number,
    heightPx: number
}


export type PlacePhotoUriResponse = {
    name: string,
    photoUri: string
}

type LocationPlace = {
    id: string,
    location: { latitude: number, longitude: number}
}

export type Place = {
    id: string,
    displayName: {
        text: string,
        languageCode: string,
    };
    types: string[];
    rating: number;
    userRatingCount: number;
    location: { latitude: number, longitude: number},
    formattedAddress: string,
    photos: v2GPhoto[]
}

export type PlacePattern = {
    theme: string;
    places : v2ReqSpot[];
}

export interface v2PlaceDetail {
    id: string,
    displayName: {
        text: string,
        languageCode: string,
    };
    types: string[];
    rating: number;
    userRatingCount: number;
    location: { latitude: number, longitude: number},
    formattedAddress: string,
    photos: v2GPhoto[],
    nationalPhoneNumber: string,
    websiteUri: string,
    regularOpeningHours: RegularOpeningHours,
    priceLevel: PriceLevel,
    editorialSummary: {
        text: string;
        languageCode: string
    }
}

interface RegularOpeningHours {
    periods: Period[],
    weekdayDescriptions: string[],
    secondaryHoursType: SecondaryHoursType,
    specialDays: SpecialDay[]
    openNow: boolean
}

interface Period {
    open: Point,
    close: Point
}

interface Point {
    date: GDate,
    truncated: boolean,
    day: number,
    hour: number,
    minute: number
}

interface GDate {
    year: number,
    month: number,
    day: number
}

type SecondaryHoursType = 
    "SECONDARY_HOURS_TYPE_UNSPECIFIED" |
    "DRIVE_THROUGH" |
    "HAPPY_HOUR" |
    "DELIVERY" |
    "TAKEOUT" |
    "KITCHEN" |
    "BREAKFAST" |
    "LUNCH" |
    "DINNER" |
    "BRUNCH" |
    "PICKUP" |
    "ACCESS" |
    "SENIOR_HOURS" |
    "ONLINE_SERVICE_HOURS"

interface SpecialDay {
    date: GDate
}

type PriceLevel = 
    "PRICE_LEVEL_UNSPECIFIED" |
    "PRICE_LEVEL_FREE" |
    "PRICE_LEVEL_INEXPENSIVE" |
    "PRICE_LEVEL_MODERATE" |
    "PRICE_LEVEL_EXPENSIVE" |
    "PRICE_LEVEL_VERY_EXPENSIVE"