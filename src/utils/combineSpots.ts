
import { IFetchAllRecommendSpot } from "src/repositories/gPlacesRepo";
import { Place, PlacePattern, PlacesResponse, v2ReqSpot, v2RoutesReq, v2SearchSpots } from "src/types";
import { Request } from "express";

// TODO: 各個別のテーマ別に生成できるようにする
// TODO: 旅行の日程に応じて、動的にスポット数を決める

interface PlacePatternAddRestSpots extends PlacePattern {
    leftRecommendSpots: v2ReqSpot[],
    nextPage?: (string | undefined)[]
}

export interface V2ReqSpotWithTheme {
    spots: v2ReqSpot[],
    theme: string,
    nextPage?: (string | undefined)[]
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
        const mergedThemeBasedPatterns: PlacePatternAddRestSpots[] = []
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


        // 1通り
        const themeBasedPatterns = copyRecommendSpots.map(
            recommendSpot => this._generateOneCombineRoute(recommendSpot, addRestaurants, addHotel)
        ) 

        // 2通り
        const pairs = this._getPairs(copyRecommendSpots);
        const twoThemeBasedPatterns = pairs.map(
            (pair) => this._generateTwoCombineRoute(pair, addRestaurants, addHotel)
        ).filter(pattern => pattern !== undefined)

        // 3通り
        const allThemeBasedPattern = this._generateAllCombineRoute(copyRecommendSpots, addRestaurants, addHotel)

        mergedThemeBasedPatterns.push(...themeBasedPatterns, ...twoThemeBasedPatterns)

        if (allThemeBasedPattern) {
            mergedThemeBasedPatterns.push(allThemeBasedPattern)
        }

        // セッションへ保存する処理
        request.session.eatingSpots = v2Restaurants;
        request.session.recommends = mergedThemeBasedPatterns.map(pattern => ({ 
            theme: pattern.theme, 
            spots: pattern.leftRecommendSpots, 
            nextPage: pattern.nextPage? pattern.nextPage: undefined 
        }))

        const resultPatterns: PlacePattern[] = mergedThemeBasedPatterns.map(pattern => ({ theme: pattern.theme, places: pattern.places }))

        // TODO: keywordを組み合わせたプランも返却したい

        return resultPatterns
    }

    saveSession(
        addRecommendSpots: V2ReqSpotWithTheme,
        recommendSpots: IFetchAllRecommendSpot[],
        req: Request<unknown, unknown, v2RoutesReq>
    ) {
        const pattern = this._generateRecommendsSession(recommendSpots);

        const saveSession: V2ReqSpotWithTheme = {
            ...addRecommendSpots,
            spots: [...addRecommendSpots.spots, ...pattern.leftRecommendSpots],
            nextPage: pattern.nextPage
        }

        req.session.recommends = req.session.recommends?.map(
            recommend => { 
                if (recommend.theme === addRecommendSpots.theme) {
                    console.log('更新情報をセッションへ保存する')
                    return saveSession
                }
                
                return recommend
            }
        )

        return saveSession
    }

    private _convertV2Spots(spots: PlacesResponse | undefined): v2ReqSpot[] {
        
        if (!spots) return []

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

    private _generateOneCombineRoute(
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
            nextPage: recommendSpot.nextPageToken? [recommendSpot.nextPageToken]: undefined
        }
    }

    private _generateTwoCombineRoute(
        recommendAllSpots: IFetchAllRecommendSpot[],
        restaurants: v2ReqSpot[],
        hotel: v2ReqSpot
    ): PlacePatternAddRestSpots | undefined {
        const [first, second] = recommendAllSpots;

        if (!first || !second) return undefined;

        const firstConV2ReqRecommendSpots = this._convertV2Spots(first)
        const firstAddRecommendSpots = firstConV2ReqRecommendSpots.splice(0, 2);

        const secondConV2ReqRecommendSpots = this._convertV2Spots(second)
        const secondAddRecommendSpots = secondConV2ReqRecommendSpots.splice(0, 2); 

        const mergedAddSpots = this._mergeRecommendSpots(firstAddRecommendSpots, secondAddRecommendSpots);
        const mergedLeftSpots = this._mergeRecommendSpots(firstConV2ReqRecommendSpots, secondConV2ReqRecommendSpots);

        const tokens = [];
        if (first.nextPageToken) {
            tokens.push(first.nextPageToken)
        }
        if (second.nextPageToken) {
            tokens.push(second.nextPageToken)
        }

        return {
            theme: `${first.keyword}/${second.keyword}`,
            places: [...mergedAddSpots, ...restaurants, hotel],
            leftRecommendSpots: [...mergedLeftSpots],
            nextPage: tokens.length > 0 ? tokens: undefined
        }
    }

    private _generateAllCombineRoute(
        recommendAllSpots: IFetchAllRecommendSpot[],
        restaurants: v2ReqSpot[],
        hotel: v2ReqSpot
    ) : PlacePatternAddRestSpots | undefined {
        const [first, second, third] = recommendAllSpots;

        if (!first || !second || !third) return undefined;

        const firstConV2ReqRecommendSpots = this._convertV2Spots(first)
        const firstAddRecommendSpots = firstConV2ReqRecommendSpots.splice(0, 2);

        const secondConV2ReqRecommendSpots = this._convertV2Spots(second)
        const secondAddRecommendSpots = secondConV2ReqRecommendSpots.splice(0, 2);

        const thirdConV2ReqRecommendSpots = this._convertV2Spots(third)
        const thirdAddRecommendSpots = thirdConV2ReqRecommendSpots.splice(0, 2);

        const mergedLeftSpots = this._mergeRecommendSpots(firstConV2ReqRecommendSpots, secondConV2ReqRecommendSpots, thirdConV2ReqRecommendSpots);
        const mergedAddSpots = this._mergeRecommendSpots(firstAddRecommendSpots, secondAddRecommendSpots, thirdAddRecommendSpots);

        const tokens = [];
        tokens.push(first.nextPageToken)
        tokens.push(second.nextPageToken)
        tokens.push(third.nextPageToken)

        return {
            theme: `${first.keyword}/${second.keyword}/${third.keyword}`,
            places: [...mergedAddSpots, ...restaurants, hotel],
            leftRecommendSpots: [...mergedLeftSpots],
            nextPage: tokens.length > 0 ? tokens: undefined
        }
    }

    private _generateRecommendsSession(
        recommendAllSpots: IFetchAllRecommendSpot[],
    ) : PlacePatternAddRestSpots {
        const [first, second, third] = recommendAllSpots;

        if (recommendAllSpots.length === 1) {
            console.log('1個のSpotをセッションへ')
            return this._generateOneSession(recommendAllSpots[0]);
        }

        if (recommendAllSpots.length === 2) {
            console.log('2個のSpotをセッションへ')
            const [first, second] = recommendAllSpots;
            return this._generateTwoSession(first, second)
        }

        console.log('3個のSpotをセッションへ')
        const firstConV2ReqRecommendSpots = this._convertV2Spots(first)
        const secondConV2ReqRecommendSpots = this._convertV2Spots(second)
        const thirdConV2ReqRecommendSpots = this._convertV2Spots(third)

        const mergedLeftSpots = this._mergeRecommendSpots(firstConV2ReqRecommendSpots, secondConV2ReqRecommendSpots, thirdConV2ReqRecommendSpots);

        const tokens = [];
        tokens.push(first ? first.nextPageToken: undefined)
        tokens.push(second ? second.nextPageToken: undefined)
        tokens.push(third ? third.nextPageToken: undefined)

        return {
            theme: `${first.keyword}/${second.keyword}/${third.keyword}`,
            places: [...mergedLeftSpots],
            leftRecommendSpots: [...mergedLeftSpots],
            nextPage: tokens.length > 0 ? tokens: undefined
        }
    }

    private _generateOneSession(
        recommendSpot: IFetchAllRecommendSpot
    ) : PlacePatternAddRestSpots {
        const firstConV2ReqRecommendSpots = this._convertV2Spots(recommendSpot)
        
        const tokens = [];
        tokens.push(recommendSpot ? recommendSpot.nextPageToken: undefined)

        return {
            theme: recommendSpot.keyword,
            places: [...firstConV2ReqRecommendSpots],
            leftRecommendSpots: [...firstConV2ReqRecommendSpots],
            nextPage: tokens.length > 0 ? tokens : undefined
        }
    }

    private _generateTwoSession(
        first: IFetchAllRecommendSpot,
        second: IFetchAllRecommendSpot,
    ): PlacePatternAddRestSpots {
        const firstConV2ReqRecommendSpots = this._convertV2Spots(first)
        const secondConV2ReqRecommendSpots = this._convertV2Spots(second)

        const mergedLeftSpots = this._mergeRecommendSpots(
            firstConV2ReqRecommendSpots, secondConV2ReqRecommendSpots
        );

        const tokens = [];
        tokens.push(first ? first.nextPageToken: undefined)
        tokens.push(second ? second.nextPageToken: undefined)

        return {
            theme: `${first.keyword}/${second.keyword}`,
            places: [...mergedLeftSpots],
            leftRecommendSpots: [...mergedLeftSpots],
            nextPage: tokens.length > 0 ? tokens: undefined
        }
    }

    private _mergeRecommendSpots(
        firstRecommends: v2ReqSpot[],
        secondRecommends: v2ReqSpot[],
        thirdRecommends?: v2ReqSpot[]
    ) {
        const result = [];

        while (
            firstRecommends.length > 0 || 
            firstRecommends.length > 0 || 
            (thirdRecommends && thirdRecommends.length > 0)
        ) {

            const first = firstRecommends.shift();
            if (first) {
                result.push(first);
            }

            const second = secondRecommends.shift();
            if (second) {
                result.push(second)
            }

            const third = thirdRecommends ? thirdRecommends.shift(): undefined;
            if (third) {
                result.push(third)
            }
        }

        return result
    }

    private _getPairs(arr: IFetchAllRecommendSpot[]): IFetchAllRecommendSpot[][] {
        let pairs: IFetchAllRecommendSpot[][] = [];
        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                pairs.push([arr[i], arr[j]]);
            }
        }
        return pairs;
    }
    
}

export default GenerateCombineSpot;