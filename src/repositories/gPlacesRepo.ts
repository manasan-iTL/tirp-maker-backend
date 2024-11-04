import { response } from "express";
import { GOOGLE_PLACES_API_KEY } from "src/const/google";
import { convertJapanese, PlaceType } from "src/const/placeTypes";
import { fetchSpotsTextSearch } from "src/lib/googlePlacesApi";
import { PlacePhotoUriResponse, PlacesResponse, Spot, v2PlaceDetail, v2ReqSpot } from "src/types";
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

interface IFetchNearbySearchBodyArgs {
    includedTypes: string[],
    excludedTypes?: string[],
    languageCode: string,
    maxResultCount: number,
    rankPreference: "POPULARITY" | "DISTANCE",
    locationRestriction?: {
        circle: {
            center: {
              latitude: number,
              longitude: number
            },
            radius: number
          }
    },
}

interface TextSearchMethod {
    requestBody: IFetchTextSearchBodyArgs,
    method: "SEARCH_TEXT"
} 

interface NearbySearchMethod {
    requestBody: IFetchNearbySearchBodyArgs,
    method: "NEARBY"
} 

interface IDecideSearchMethodArgs {
    value: string,
    spot: v2ReqSpot
}

type IDecideSearchMethodResponse = TextSearchMethod | NearbySearchMethod

interface IFetchPlaceDetailHeaderArgs {
    placeId: string
}

export interface IFetchPlacePhotoRequestArgs {
    place_id: string,
    photoId: string,
    maxHeightPx: number,
    maxWidthPx: number,
    skipHttpRedirect: boolean
}

interface ICreateRecommendSpotReqBody {
    keyword: string,
    spot: v2ReqSpot,
}

interface INearbySearchReqBody {
    types: string[],
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
    private _NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"
    private _PHOTO_URL = "https://places.googleapis.com/v1";
    private _DETAIL_URL = "https://places.googleapis.com/v1/places"



    private async _fetchTextSearch(body: IFetchTextSearchBodyArgs, header: Headers | null = null) {

        // TODO: ヘッダーを生成する関数に切り出す
        const requestHeader = header ?? new Headers({
            'Content-Type': 'application/json',
            // FieldMaskに指定できる値は公式リファレンスを参照
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.userRatingCount,places.rating,places.photos',
            'X-Goog-Api-Key': this._GOOGLE_API_KEY
        })

        try {
            const rawResponse = await fetch(`${this._BASE_URL}?languageCode=ja`, {
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

    private async _fetchNearbySearch(body: IFetchNearbySearchBodyArgs, header: Headers | null = null) {

        // TODO: ヘッダーを生成する関数に切り出す
        const requestHeader = header ?? new Headers({
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.userRatingCount,places.rating,places.photos',
            'X-Goog-Api-Key': this._GOOGLE_API_KEY
        })

        try {
            const rawResponse = await fetch(`${this._NEARBY_URL}`, {
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

    private async _fetchPlaceDetail(args: IFetchPlaceDetailHeaderArgs) {

        const headers = new Headers({
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this._GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,userRatingCount,rating,photos,nationalPhoneNumber,websiteUri,regularOpeningHours,priceLevel,editorialSummary'
        })

        try {
            const requestUri = `${this._DETAIL_URL}/${args.placeId}?languageCode=ja`
            const rawResponse = await fetch(requestUri, {
                method: "GET",
                headers: headers
            })

            const response: v2PlaceDetail = await rawResponse.json();
            return response
        } catch (error) {
            console.log(error)
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

        const requestUrl = `${this._PHOTO_URL}/places/${args.place_id}/photos/${args.photoId}/media?${searchParams}` 
        
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

    private _createNeabySearchReqBody(args: INearbySearchReqBody): IFetchNearbySearchBodyArgs {
        const calcRectangle = new CalcSpotPoint().calcReqtanglePoint(args.spot);

        return {
            includedTypes: args.types,
            languageCode: "ja",
            rankPreference: "POPULARITY",
            maxResultCount: 10,
            locationRestriction: {
                circle: {
                    center: {
                        latitude: args.spot.location.latitude,
                        longitude: args.spot.location.longitude
                    },
                    radius: 50000.0
                }
            }
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

    private _convertGtypes(value: string): string[] {
        switch (value) {
            case PlaceType.amusementPark:
                return ["amusement_park", "amusement_center"]
        
            case PlaceType.themePark:
                return ["amusement_park", "amusement_center"]
            
            case PlaceType.hiking:
                return ["hiking_area"]
            
            case PlaceType.famousPlaces:
                return ["historical_landmark"]
            
            case PlaceType.MuseumArtGallery:
                return ["art_gallery", "museum"]
            
            case PlaceType.zoo:
                return ["zoo"]

            case PlaceType.aquarium:
                return ["aquarium"]
            
            default:
                return ["SEARCH_KEYWORD"];
        }
    }

    private _convertSearchKeyword(value: string): string {
        switch (value) {
            case PlaceType.NaturalScenery:
                return "自然景観巡り"
            
            case PlaceType.marineSports:
                return "マリンスポーツ"
        
            case PlaceType.snowSports:
                return "スノースポーツ"
            
            case PlaceType.craft:
                return "クラフト体験"

            case PlaceType.TraditionalCraft:
                return "伝統工芸体験"
            
            case PlaceType.factory:
                return "工場見学"
            default:
                return "有名な観光スポット"
        }
    }

    private _decideSearchMethod(args: IDecideSearchMethodArgs): IDecideSearchMethodResponse {
        const { value, spot } = args;

        const types = this._convertGtypes(value);

        if (types.includes("SEARCH_KEYWORD")) {
            const keyword = this._convertSearchKeyword(value);

            const reqBody = this._createRecommendSpotReqBody({ keyword, spot })

            return {
                method: "SEARCH_TEXT",
                requestBody: reqBody
            }
        }

        // COMMENT: Nearby Search
        const reqBody = this._createNeabySearchReqBody({ types, spot });

        return {
            method: "NEARBY",
            requestBody: reqBody
        }
    }

    private async _fetchRecommendSpot(args: IDecideSearchMethodResponse) {
        const { method, requestBody } = args;

        try {
            if (method === "NEARBY") {
                const response: PlacesResponse = await this._fetchNearbySearch(requestBody);

                return response
            }

            const response: PlacesResponse = await this._fetchTextSearch(requestBody);

            return response
        } catch (error) {
            console.log(error,{ depth: null, colors: true })

            return {
                places: []
            }
        }
    }

    async searchPlacesWithKeyword(keyword: string): Promise<PlacesResponse> {
        const reqBody = this._searchPlaceWithKeyword(keyword);
        const response = await this._fetchTextSearch(reqBody.body, reqBody.headers);
        const addTypeSpot = this._addType(response, "recommend", true);
        return addTypeSpot
    }

    async fetchPlaceDetail(place_id: string) {
        const response = await this._fetchPlaceDetail({ placeId: place_id });
        return response
    }

    async fetchAllRecommendSpots(keywords: string[], argSpot: v2ReqSpot): Promise<IFetchAllRecommendSpot[]> {

        const result: IFetchAllRecommendSpot[] = [];
        
        for (let i = 0; i < keywords.length; i++) {
            const methodReqBody = this._decideSearchMethod({ value: keywords[i], spot: argSpot })
            const spot = await this._fetchRecommendSpot(methodReqBody);
            const addTypeSpot = this._addType(spot, "recommend")
            const theme = convertJapanese(keywords[i]);
            result.push({ keyword: theme, places: addTypeSpot.places })
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