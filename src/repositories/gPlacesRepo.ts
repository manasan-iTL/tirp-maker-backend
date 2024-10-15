import { response } from "express";
import { GOOGLE_PLACES_API_KEY } from "src/const/google";
import { PlaceType } from "src/const/placeTypes";
import { fetchSpotsTextSearch } from "src/lib/googlePlacesApi";
import { PlacePhotoUriResponse, PlacesResponse, Spot, v2ReqSpot } from "src/types";
import CalcSpotPoint from "src/utils/calcSpotPoint";

export interface IFetchAllRecommendSpot extends PlacesResponse {
    keyword: string;
}

interface IFetchTextSearchBodyArgs {
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

export interface IFetchPlacePhotoRequestArgs {
    photoId: string,
    maxHeightPx: number,
    maxWidthPx: number,
    skipHttpRedirect: boolean
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
    private _PHOTO_URL = "https://places.googleapis.com/v1";



    private async _fetchTextSearch(body: IFetchTextSearchBodyArgs, header: Headers | null = null) {

        // TODO: ヘッダーを生成する関数に切り出す
        const requestHeader = header ?? new Headers({
            'Content-Type': 'application/json',
            // FieldMaskに指定できる値は公式リファレンスを参照
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.userRatingCount,places.rating',
            'X-Goog-Api-Key': this._GOOGLE_API_KEY
        })

        try {
            const rawResponse = await fetch(`${this._BASE_URL}`, {
                method: "POST",
                headers: requestHeader,
                body: JSON.stringify(body)
            })
    
            const response: PlacesResponse = await rawResponse.json()
    
            return response
        } catch (error) {
            console.log(error)
            return { places: [] };
        }
    }

    private async _fetchPlacePhoto(args: IFetchPlacePhotoRequestArgs): Promise<PlacePhotoUriResponse> {
        const params = { 
            maxHeightPx: String(args.maxHeightPx),
            maxWidthPx: String(args.maxWidthPx),
            skipHttpRedirect: "true",
            key: GOOGLE_PLACES_API_KEY
        }

        const searchParams = new URLSearchParams(params).toString();

        const requestUrl = `${this._PHOTO_URL}/${args.photoId}/media?${searchParams}` 
        
        try {
            const rawPhoto = await fetch(requestUrl, {
                method: "GET",
            })

            const photo: PlacePhotoUriResponse = await rawPhoto.json();

            return photo

        } catch (error) {
            console.log(error)
            return {
                name: "",
                photoUri: ""
            }
        }

    }

    private _searchPlaceWithKeyword(keyword: string): { body: IFetchTextSearchBodyArgs, headers: Headers } {
        const body = {
            textQuery: keyword,
            languageCode: "ja",
            pageSize: 10
        }

        const headers = new Headers({
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.userRatingCount,places.rating,places.photos',
            'X-Goog-Api-Key': this._GOOGLE_API_KEY            
        })

        return {
            body,
            headers
        }
    }

    private _createRecommendSpotReqBody(args: ICreateRecommendSpotReqBody): IFetchTextSearchBodyArgs {

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

    private _createHotelReqBody(args: ICreateHotelReqBody): IFetchTextSearchBodyArgs {
        return {
            textQuery: args.keyword,
            languageCode: "ja",
            includedType: "hotel",
            strictTypeFiltering: true,
            locationBias: {
                circle: {
                    center: {
                        latitude: args.spot.location.latitude,
                        longitude: args.spot.location.longitude
                    },
                    radius: 25000.0
                }
            }
        }
    }

    // COMMENT: NearBySearchの方がtypeでもっと複雑に検索できる
    private _createEatingReqBody(args: ICreateEatingReqBody): IFetchTextSearchBodyArgs {
        return {
            textQuery: args.keyword,
            languageCode: "ja",
            includedType: "restaurant",
            strictTypeFiltering: true,
            locationBias: {
                circle: {
                    center: {
                        latitude: args.spot.location.latitude,
                        longitude: args.spot.location.longitude
                    },
                    radius: 25000.0
                }
            }
        }
    }

    private _addType(spot: PlacesResponse, searchType: "hotel" | "eating" | "recommend", must: boolean = false): PlacesResponse {
        spot.places.forEach(place => {

            if (must) {
                place.types.push(PlaceType.must);
                return 
            }

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

    async searchPlacesWithKeyword(keyword: string): Promise<PlacesResponse> {
        const reqBody = this._searchPlaceWithKeyword(keyword);
        const response = await this._fetchTextSearch(reqBody.body, reqBody.headers);
        const addTypeSpot = this._addType(response, "recommend", true);
        return addTypeSpot
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

    async fetchPhtoSingleUri(params: IFetchPlacePhotoRequestArgs) : Promise<PlacePhotoUriResponse> {
        const response = await this._fetchPlacePhoto(params);
        return response
    }
}

export default GPlacesRepo;