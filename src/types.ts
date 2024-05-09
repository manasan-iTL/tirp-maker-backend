import { LatLng }  from "@googlemaps/google-maps-services-js";

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

export type v2SearchSpots = {
    spots?: Spot[],
    area?: string,
    depatureAt: Spot[],
    date: {
        depatureDay: string,
        returnDay: string,
    },
    transitWay: 'CAR' | 'train',
    condition?: Condition
}

type Condition = {
    eating: string[],
    wantedDo: string[],
    hotel: string[]
}
