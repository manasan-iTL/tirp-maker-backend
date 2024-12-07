
import { IFetchAllRecommendSpot } from "src/repositories/gPlacesRepo";
import { Place, PlacePattern, PlacesResponse, v2ReqSpot, v2SearchSpots } from "src/types";
import { Request } from "express";

// TODO: 各個別のテーマ別に生成できるようにする
// TODO: 旅行の日程に応じて、動的にスポット数を決める

interface PlacePatternAddRestSpots extends PlacePattern {
    leftRecommendSpots: v2ReqSpot[],
    nextPage?: string
}

export interface V2ReqSpotWithTheme {
    spots: v2ReqSpot[],
    theme: string,
    nextPage?: string
}

export function generateRecommendedRoutes(
    spots: PlacesResponse | undefined,
    restaurants: PlacesResponse | undefined,
    hotels: PlacesResponse | undefined,
    maxRoutes: number = 5
): Place[][] {
    const recommendedRoutes: Place[][] = [];

    if (!spots || !restaurants || !hotels) return recommendedRoutes

    // TODO: 滞在日数や移動時間を考慮し、動的な抽出を行う
    for (let i = 0; i < 3; i++) {
         // 食事場所
    const eatingSpots = restaurants.places.splice(0, 2);

    // ホテル
    const hotelSpot = hotels.places.splice(0, 1);

    // 観光スポット
    const recommendSpots = spots.places.splice(0, 3);

    const route = [ ...eatingSpots, ...hotelSpot, ...recommendSpots ]  
    
    recommendedRoutes.push(route)
    }

    return recommendedRoutes;
}

class GenerateCombineSpot {

    basedThemeCombineSpot(
        recommendSpots: IFetchAllRecommendSpot[],
        restaurants: PlacesResponse | undefined,
        hotels: PlacesResponse | undefined,
        request: Request<unknown, unknown, v2SearchSpots>,
    ): PlacePattern[] {

        // TODO: 現状はSpot数は固定。ゆくゆくは動的にしたい

        const result: PlacePattern[] = [];
        if (!restaurants || !hotels) return result;

        // COMMENT: keyword毎のプランを返却する
        const copyRecommendSpots = JSON.parse(JSON.stringify(recommendSpots)) as IFetchAllRecommendSpot[];
        const copyRestaurants = JSON.parse(JSON.stringify(restaurants)) as PlacesResponse;
        const copyHotels = JSON.parse(JSON.stringify(hotels)) as PlacesResponse;

        const v2Restaurants = this._convertV2Spots(copyRestaurants);
        const v2Hotels = this._convertV2Spots(copyHotels);

        // Hotel / Eating spotsを抽出
        const addRestaurants = v2Restaurants.splice(0, 2);
        const [addHotel] = v2Hotels.splice(0, 1);


        const themeBasedPatterns = copyRecommendSpots.map(
            recommendSpot => this.generateOneCombineRoute(recommendSpot, addRestaurants, addHotel)
        ) 

        // セッションへ保存する処理
        request.session.eatingSpots = v2Restaurants;
        request.session.recommends = themeBasedPatterns.map(pattern => ({ theme: pattern.theme, spots: pattern.leftRecommendSpots }))

        const resultPatterns: PlacePattern[] = themeBasedPatterns.map(pattern => ({ theme: pattern.theme, places: pattern.places }))

        // TODO: keywordを組み合わせたプランも返却したい

        return resultPatterns
    }

    private _convertV2Spots(spots: PlacesResponse): v2ReqSpot[] {
        const v2ReqSpots = spots.places.map(spot => ({
            place_id: spot.id,
            spotName: spot.displayName.text,
            spotImgSrc: "",
            spotImgAlt: "",
            location: spot.location,
            rating: spot.rating,
            userRatingCount: spot.userRatingCount,
            formattedAddress: spot.formattedAddress,
            types: spot.types,
            photoReference: spot?.photos ? spot.photos[0]: ''
        }))

        return v2ReqSpots
    }

    private generateOneCombineRoute(
        recommendSpot: IFetchAllRecommendSpot,
        restaurants: v2ReqSpot[],
        hotel: v2ReqSpot
    ): PlacePatternAddRestSpots {

        // 観光スポットの抽出
        const conV2ReqRecommendSpots = this._convertV2Spots(recommendSpot)
        const addRecommendSpots = conV2ReqRecommendSpots.splice(0, 4);

        return {
            theme: recommendSpot.keyword,
            places: [...addRecommendSpots, ...restaurants, hotel],
            leftRecommendSpots: conV2ReqRecommendSpots,
            nextPage: recommendSpot.nextPageToken
        }
    }
}

export default GenerateCombineSpot;