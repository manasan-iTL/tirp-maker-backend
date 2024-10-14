
import { IFetchAllRecommendSpot } from "src/repositories/gPlacesRepo";
import { Place, PlacePattern, PlacesResponse, v2ReqSpot } from "src/types";

// TODO: 各個別のテーマ別に生成できるようにする
// TODO: 旅行の日程に応じて、動的にスポット数を決める

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
        hotels: PlacesResponse | undefined
    ): PlacePattern[] {

        // TODO: 現状はSpot数は固定。ゆくゆくは動的にしたい

        const result: PlacePattern[] = [];
        if (!restaurants || !hotels) return result;

        // COMMENT: keyword毎のプランを返却する
        const copyRecommendSpots = JSON.parse(JSON.stringify(recommendSpots)) as IFetchAllRecommendSpot[];
        const copyRestaurants = JSON.parse(JSON.stringify(restaurants)) as PlacesResponse;
        const copyHotels = JSON.parse(JSON.stringify(hotels)) as PlacesResponse;

        const themeBasedPatterns = copyRecommendSpots.map(
            recommendSpot => this.generateOneCombineRoute(recommendSpot, copyRestaurants, copyHotels)
        ) 

        // TODO: keywordを組み合わせたプランも返却したい

        return themeBasedPatterns
    }

    private generateOneCombineRoute(
        recommendSpot: IFetchAllRecommendSpot,
        restaurants: PlacesResponse,
        hotels: PlacesResponse
    ): PlacePattern {

        // 観光スポットの抽出
        const recommendSpots = recommendSpot.places.splice(0, 4);
        const conV2ReqRecommendSpots: v2ReqSpot[] = recommendSpots.map(spot => ({
            place_id: spot.id,
            spotName: spot.displayName.text,
            spotImgSrc: "",
            spotImgAlt: "",
            location: spot.location,
            rating: spot.rating,
            userRatingCount: spot.userRatingCount,
            formattedAddress: spot.formattedAddress,
            types: spot.types
        }))

        // ホテルの抽出
        const hotel = hotels.places.splice(0, 1);
        const conV2ReqHotel: v2ReqSpot[] = hotel.map(spot => ({
            place_id: spot.id,
            spotName: spot.displayName.text,
            spotImgSrc: "",
            spotImgAlt: "",
            location: spot.location,
            rating: spot.rating,
            userRatingCount: spot.userRatingCount,
            formattedAddress: spot.formattedAddress,
            types: spot.types
        }))

        // 食事場所の抽出
        const eatingSpots = restaurants.places.splice(0, 2);
        const conV2ReqEatingSpots: v2ReqSpot[] = eatingSpots.map(spot => ({
            place_id: spot.id,
            spotName: spot.displayName.text,
            spotImgSrc: "",
            spotImgAlt: "",
            location: spot.location,
            rating: spot.rating,
            userRatingCount: spot.userRatingCount,
            formattedAddress: spot.formattedAddress,
            types: spot.types
        }))

        return {
            theme: recommendSpot.keyword,
            places: [...conV2ReqRecommendSpots, ...conV2ReqHotel, ...conV2ReqEatingSpots]
        }
    }
}

export default GenerateCombineSpot;