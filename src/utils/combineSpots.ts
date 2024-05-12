
import { Place, PlacesResponse } from "src/types";

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