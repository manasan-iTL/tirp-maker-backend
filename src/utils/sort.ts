import { PlacesResponse } from "src/types";

export function sortSpotsByRatings(spots: PlacesResponse | undefined): PlacesResponse | undefined {

    if (!spots) return undefined
    
    // 評価数と平均評価でソート
    spots.places.sort((a, b) => {
        if (b.rating !== a.rating) {
            return b.rating - a.rating;
        }
        return b.userRatingCount - a.userRatingCount;
    });

    return spots;
}