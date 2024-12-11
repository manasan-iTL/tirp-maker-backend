import { Request, response } from "express";
import { GOOGLE_PLACES_API_KEY } from "src/const/google";
import { convertJapanese, PlaceType } from "src/const/placeTypes";
import { fetchSpotsTextSearch } from "src/lib/googlePlacesApi";
import { PlacePhotoUriResponse, PlacesLocation, PlacesResponse, Spot, v2PlaceDetail, v2ReqSpot, v2RoutesReq } from "src/types";
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
    spot: v2ReqSpot,
    days: number
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
    days: number,
    pageToken?: string
}

interface INearbySearchReqBody {
    types: string[],
    spot: v2ReqSpot,
    days: number,
}

interface ICreateHotelReqBody {
    keyword: string,
    spot: v2ReqSpot,
}

interface ICreateEatingReqBody {
    keyword: string,
    spot: v2ReqSpot
}

interface IFetchAddRecommendSpots {
    theme: string,
    spot: v2ReqSpot,
    nextPage?: string,
    days: number,
    request: Request<unknown, unknown, v2RoutesReq>
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
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.userRatingCount,places.rating,places.photos,nextPageToken',
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

    private async _fetchLocationTextSearch(body: IFetchTextSearchBodyArgs, header: Headers | null = null) {

        // TODO: ヘッダーを生成する関数に切り出す
        const requestHeader = header ?? new Headers({
            'Content-Type': 'application/json',
            // FieldMaskに指定できる値は公式リファレンスを参照
            'X-Goog-FieldMask': 'places.id,places.location',
            'X-Goog-Api-Key': this._GOOGLE_API_KEY
        })

        try {
            const rawResponse = await fetch(`${this._BASE_URL}?languageCode=ja`, {
                method: "POST",
                headers: requestHeader,
                body: JSON.stringify(body)
            })
    
            const response: PlacesLocation = await rawResponse.json()
    
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

    private _createLocationReqBody(depaturekeyword: string): IFetchTextSearchBodyArgs {
        return {
            textQuery: depaturekeyword,
            languageCode: "ja",
            pageSize: 1
        }
    }

    private _createRecommendSpotReqBody(args: ICreateRecommendSpotReqBody): IFetchTextSearchBodyArgs {

        // locationRestriction計算
        const calcRectangle = new CalcSpotPoint().calcReqtanglePoint(args.spot)
        const count = args.days * 10 <= 20 ? args.days * 20 : 20;

        return {
            textQuery: args.keyword,
            languageCode: "ja",
            locationRestriction: {
                rectangle: calcRectangle
            },
            pageSize: count,
            pageToken: args.pageToken? args.pageToken: ""
        }
    }

    private _createNeabySearchReqBody(args: INearbySearchReqBody): IFetchNearbySearchBodyArgs {
        const calcRectangle = new CalcSpotPoint().calcReqtanglePoint(args.spot);
        const count = args.days * 10 <= 20 ? args.days * 20 : 20;

        return {
            includedTypes: args.types,
            languageCode: "ja",
            rankPreference: "POPULARITY",
            maxResultCount: count,
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

    private _addType(spot: PlacesResponse, searchType: string, must: boolean = false): PlacesResponse {
        spot.places.forEach(place => {

            if (must) {
                console.log("MUSTを追加")
                place.types.push(PlaceType.must); 
            }

            switch (searchType) {
                case PlaceType.hotel:
                    place.types.push(PlaceType.hotel)
                    break;
            
                case PlaceType.eating:
                    place.types.push(PlaceType.eating)
                    break
                
                case PlaceType.amusementPark:
                    place.types.push(PlaceType.amusementPark)
                    break;

                case PlaceType.themePark:
                    place.types.push(PlaceType.themePark)
                    break;

                case PlaceType.hiking:
                    place.types.push(PlaceType.hiking)
                    break;
                
                case PlaceType.NaturalScenery:
                    place.types.push(PlaceType.NaturalScenery)
                    break;
                
                case PlaceType.marineSports:
                    place.types.push(PlaceType.marineSports)
                    break;

                case PlaceType.snowSports:
                    place.types.push(PlaceType.snowSports)
                    break;

                case PlaceType.famousPlaces:
                    place.types.push(PlaceType.famousPlaces)
                    break;

                case PlaceType.MuseumArtGallery:
                    place.types.push(PlaceType.MuseumArtGallery)
                    break;

                case PlaceType.craft:
                    place.types.push(PlaceType.craft)
                    break;

                case PlaceType.TraditionalCraft:
                    place.types.push(PlaceType.TraditionalCraft)
                    break;

                case PlaceType.factory:
                    place.types.push(PlaceType.factory)
                    break;

                case PlaceType.zoo:
                    place.types.push(PlaceType.zoo)
                    break;

                case PlaceType.aquarium:
                    place.types.push(PlaceType.aquarium)
                    break;

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

    private _convertGtypesToTypes(response: PlacesResponse, isMust: boolean = false): PlacesResponse {
        response.places.forEach(place => {
            const types = place.types;

            if (isMust) {
                types.push(PlaceType.must);
            }

            if (types.includes('amusement_park') || types.includes('amusement_center')) {
                types.push(PlaceType.amusementPark)
                return
            } 

            if (types.includes('hiking_area')) {
                types.push(PlaceType.hiking);
                return
            }

            if (types.includes('historical_landmark')) {
                types.push(PlaceType.famousPlaces);
                return
            }

            if (types.includes('art_gallery') || types.includes('museum')) {
                types.push(PlaceType.MuseumArtGallery);
                return
            }

            if (types.includes('zoo')) {
                types.push(PlaceType.zoo);
                return
            }

            if (types.includes('aquarium')) {
                types.push(PlaceType.aquarium);
                return
            }

            // Typesで絞れないものは、PlaceType.famousPlacesに統一
            types.push(PlaceType.famousPlaces);
        })

        return response
    }

    private _convertSearchKeyword(value: string): string {
        switch (value) {
            case PlaceType.NaturalScenery:
                return "おすすめ 自然景観巡り"
            
            case PlaceType.marineSports:
                return "おすすめ マリンスポーツ"
        
            case PlaceType.snowSports:
                return "おすすめ スノースポーツ"
            
            case PlaceType.craft:
                return "おすすめ クラフト体験"

            case PlaceType.TraditionalCraft:
                return "おすすめ 伝統工芸体験"
            
            case PlaceType.factory:
                return "おすすめ 工場見学"
            default:
                return "有名な観光スポット"
        }
    }

    private _decideSearchMethod(args: IDecideSearchMethodArgs): IDecideSearchMethodResponse {
        const { value, spot, days } = args;

        const types = this._convertGtypes(value);

        if (types.includes("SEARCH_KEYWORD")) {
            const keyword = this._convertSearchKeyword(value);

            const reqBody = this._createRecommendSpotReqBody({ keyword, spot, days })

            return {
                method: "SEARCH_TEXT",
                requestBody: reqBody
            }
        }

        // COMMENT: Nearby Search
        const reqBody = this._createNeabySearchReqBody({ types, spot, days });

        return {
            method: "NEARBY",
            requestBody: reqBody
        }
    }

    private async _fetchRecommendSpot(args: IDecideSearchMethodResponse) {
        const { method, requestBody } = args;

        console.log(requestBody)

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
        const addTypeSpot = this._convertGtypesToTypes(response, true);
        return addTypeSpot
    }

    async getDepatureLocation(origin: v2ReqSpot): Promise<v2ReqSpot> {
        if (origin.location.latitude !== 0 && origin.location.longitude !== 0) return origin

        const reqBody = this._createLocationReqBody(origin.spotName);
        const response = await this._fetchLocationTextSearch(reqBody);

        const newOrigin =  {
            ...origin,
            location: response.places[0].location
        }

        console.log(newOrigin)
        
        return newOrigin
    }

    async fetchPlaceDetail(place_id: string) {
        const response = await this._fetchPlaceDetail({ placeId: place_id });
        return response
    }

    async fetchAllRecommendSpots(keywords: string[], argSpot: v2ReqSpot, days: number): Promise<IFetchAllRecommendSpot[]> {

        const result: IFetchAllRecommendSpot[] = [];
        
        for (let i = 0; i < keywords.length; i++) {
            const methodReqBody = this._decideSearchMethod({ value: keywords[i], spot: argSpot, days })
            const spot = await this._fetchRecommendSpot(methodReqBody);

            const addTypeSpot = this._addType(spot, keywords[i]);
            const theme = convertJapanese(keywords[i]);
            result.push({ keyword: theme, places: addTypeSpot.places })
        }

        return result
    } 

    async fetchHotelSpots(keyword: string, argSpot: v2ReqSpot): Promise<PlacesResponse> {
        const reqBody = this._createHotelReqBody({ keyword, spot: argSpot });
        const response = await this._fetchTextSearch(reqBody);
        const addTypeSpot = this._addType(response, PlaceType.hotel);
        return addTypeSpot
    }

    async fetchEatingSpots(params: ICreateEatingReqBody) : Promise<PlacesResponse>{
        const reqBody = this._createEatingReqBody(params);
        const response = await this._fetchTextSearch(reqBody);
        const addTypeSpot = this._addType(response, PlaceType.eating);
        return addTypeSpot
    }

    async fetchPhtoSingleUri(params: IFetchPlacePhotoRequestArgs) : Promise<PlacePhotoUriResponse> {
        const response = await this._fetchPlacePhoto(params);
        return response
    }

    async fetchAddRecommendSpots({theme, nextPage, spot, days}: IFetchAddRecommendSpots): Promise<IFetchAllRecommendSpot> {
        // nextPageがある場合はそのまま検索

        if (nextPage) {
            const keyword = 'おすすめ ' + theme;
            const reqBody = this._createRecommendSpotReqBody({ keyword, spot, days, pageToken: nextPage});
            const response = await this._fetchTextSearch(reqBody);
            const type = convertJapaneseToType(theme);
            const addTypeSpot = this._addType(response, type);
            return { keyword: theme, places: addTypeSpot.places }
        }

        // nextPageが無い場合、nearbySearchからテキスト検索へ移行
        // 検索キーワード: 「おすすめ theme（テーマパーク）」
        const searchKeyword = 'おすすめ ' + theme;

        const reqBody = this._createRecommendSpotReqBody({ keyword: searchKeyword, spot, days });
        const response = await this._fetchTextSearch(reqBody);
        return { keyword: theme, places: response.places }
    }
}

export default GPlacesRepo;