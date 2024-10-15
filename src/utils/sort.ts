import { IFetchAllRecommendSpot } from "src/repositories/gPlacesRepo";
import { PlacesResponse } from "src/types";

class sortedSpots {

    sortSpotsByRatings(spots: PlacesResponse): PlacesResponse | undefined {

        if (spots.places.length < 0) return undefined
        
        // 評価数と平均評価でソート
        spots.places.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.userRatingCount - a.userRatingCount;
        });
    
        return spots;
    }

    sortMutipleSpotsByRating(spots: IFetchAllRecommendSpot[]): IFetchAllRecommendSpot[] {
        const result = spots.map((spot) => {
            const sortedSpot = this.sortSpotsByRatings(spot);
            if (!sortedSpot) {
                const emptySpot: IFetchAllRecommendSpot = {
                    keyword: spot.keyword,
                    places: []
                }
                return emptySpot
            } else {
                const newSpot: IFetchAllRecommendSpot = {
                    keyword: spot.keyword,
                    ...sortedSpot
                }

                return newSpot
            }
        })

        return result;
    }
}

export default sortedSpots