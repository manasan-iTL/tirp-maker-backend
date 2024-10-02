import { GOOGLE_PLACES_API_KEY } from "src/const/google";
import { PlaceType } from "src/const/placeTypes";
import { PlacesResponse, Spot, v2ReqSpot } from "src/types";
import CalcSpotPoint from "src/utils/calcSpotPoint";
import { fetchSpotsViaV2TextSearch } from "src/utils/extrack";

export interface IFetchAllRecommendSpot extends PlacesResponse {
    keyword: string;
}

interface IFetchTextSearchArgs {
    textQuery: string,
    languageCode: string,
    includedType?: string,
    strictTypeFiltering?: boolean; 
    locationBias?: {
        circle: {
            center: {
              latitude: number,
              longitude: number
            },
            radius: number
          }
    },
    locationRestriction?: {
        rectangle: {
            low: {
              latitude: number,
              longitude: number
            },
            high: {
              latitude: number,
              longitude: number
            }
        }
    },
    pageSize?: number,
    pageToken?: string,
}

interface ICreateRecommendSpotReqBody {
    keyword: string,
    spot: v2ReqSpot,
}

interface ICreateHotelReqBody {
    keyword: string,
    spot: v2ReqSpot,
}

interface ICreateEatingReqBody {
    keyword: string,
    spot: v2ReqSpot
}

class GPlacesRepo {

    private _GOOGLE_API_KEY = GOOGLE_PLACES_API_KEY;
    private _BASE_URL = "https://places.googleapis.com/v1/places:searchText";



    private async _fetchTextSearch(args: IFetchTextSearchArgs) {

        // TODO: ヘッダーを生成する関数に切り出す
        const requestHeader = new Headers({
            'Content-Type': 'application/json',
            // FieldMaskに指定できる値は公式リファレンスを参照
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.userRatingCount,places.rating',
            'X-Goog-Api-Key': this._GOOGLE_API_KEY
        })

        try {
            const rawResponse = await fetch(`${this._BASE_URL}`, {
                method: "POST",
                headers: requestHeader,
                body: JSON.stringify(args)
            })
    
            const response: PlacesResponse = await rawResponse.json()
    
            return response
        } catch (error) {
            console.log(error)
            return { places: [] };
        }
    }

    private _createRecommendSpotReqBody(args: ICreateRecommendSpotReqBody): IFetchTextSearchArgs {

        // locationRestriction計算
        const calcRectangle = new CalcSpotPoint().calcReqtanglePoint(args.spot)

        return {
            textQuery: args.keyword,
            languageCode: "ja",
            locationRestriction: {
                rectangle: calcRectangle
            },
            pageSize: 15
        }
    }

    private _createHotelReqBody(args: ICreateHotelReqBody): IFetchTextSearchArgs {
        return {
            textQuery: args.keyword,
            languageCode: "ja",
            includedType: "hotel",
            strictTypeFiltering: true,
            locationBias: {
                circle: {
                    center: {
                        latitude: args.spot.location.lat,
                        longitude: args.spot.location.lng
                    },
                    radius: 25000.0
                }
            }
        }
    }

    // COMMENT: NearBySearchの方がtypeでもっと複雑に検索できる
    private _createEatingReqBody(args: ICreateEatingReqBody): IFetchTextSearchArgs {
        return {
            textQuery: args.keyword,
            languageCode: "ja",
            includedType: "restaurant",
            strictTypeFiltering: true,
            locationBias: {
                circle: {
                    center: {
                        latitude: args.spot.location.lat,
                        longitude: args.spot.location.lng
                    },
                    radius: 25000.0
                }
            }
        }
    }

    private _addType(spot: PlacesResponse, searchType: "hotel" | "eating" | "recommend"): PlacesResponse {
        spot.places.forEach(place => {
            switch (searchType) {
                case "hotel":
                    place.types.push(PlaceType.hotel)
                    break;
            
                case "eating":
                    place.types.push(PlaceType.eating)
                    break
                
                case "recommend":
                    place.types.push(PlaceType.sightseeing)
                default:
                    break;
            }
        })

        return spot
    }

    async fetchAllRecommendSpots(keywords: string[], argSpot: v2ReqSpot): Promise<IFetchAllRecommendSpot[]> {

        const result: IFetchAllRecommendSpot[] = [];
        
        for (let i = 0; i < keywords.length; i++) {
            const reqBody = this._createRecommendSpotReqBody({ keyword: keywords[i], spot: argSpot })
            const spot = await this._fetchTextSearch(reqBody);
            const addTypeSpot = this._addType(spot, "recommend")
            result.push({ keyword: keywords[i], places: addTypeSpot.places })
        }

        return result
    } 

    async fetchHotelSpots(keyword: string, argSpot: v2ReqSpot): Promise<PlacesResponse> {
        const reqBody = this._createHotelReqBody({ keyword, spot: argSpot });
        const response = await this._fetchTextSearch(reqBody);
        const addTypeSpot = this._addType(response, "hotel");
        return addTypeSpot
    }

    async fetchEatingSpots(params: ICreateEatingReqBody) : Promise<PlacesResponse>{
        const reqBody = this._createEatingReqBody(params);
        const response = await this._fetchTextSearch(reqBody);
        const addTypeSpot = this._addType(response, "eating");
        return addTypeSpot
    }
}

export default GPlacesRepo;