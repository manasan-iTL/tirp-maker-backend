import { LatLngLiteral } from "@googlemaps/google-maps-services-js";
import { PlacesResponse } from "src/types";
import { GOOGLE_PLACES_API_KEY } from "src/const/google";

export async function fetchSpotsViaV2TextSearch(keyword: string, places?: string) {
    const BASE_URL = "https://places.googleapis.com/v1/places:searchText"

    const requestHeader = new Headers({
        'Content-Type': 'application/json',
        // FieldMaskに指定できる値は公式リファレンスを参照
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.userRatingCount,places.rating',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
    })

    const requestBody = {
        // 必須のパラメーター
        textQuery: keyword,

        // これ以降はオプションのパラメーター
        languageCode: "ja",
        maxResultCount: 15,
        // includedType: "",
        // strictTypeFiltering: boolean,
        // locationBias: {},
        // locationRestriction: {},
        // minRating: 0.0 ~ 5.0,
        // openNow: boolean,
        // priceLevels: [],
        // rankPreference: DISTANCE/RELEVANCE,
    }

    try {
        const rawResponse = await fetch(`${BASE_URL}`, {
            method: "POST",
            headers: requestHeader,
            body: JSON.stringify(requestBody)
        })

        const response: PlacesResponse = await rawResponse.json()

        return response
    } catch (error) {
        console.log(error)
        return { places: [] };
    }
}

export async function fetchSpotsViaV2NearBySearch() {
    const BASE_URL = "https://places.googleapis.com/v1/places:searchNearby"

    const requestHeader = new Headers({
        'Content-Type': 'application/json',
        // FieldMaskに指定できる値は公式リファレンスを参照
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
    })

    const requestBody = {
        // 必須のパラメーター
        locationRestriction: {
            circle: {
                center: {
                    "latitude": 35.69378380653818,
                    "longitude": 139.7365565519017
                },
                radius: 50000.0
            }
        },

        // これ以降はオプションのパラメーター
        languageCode: "ja",
        maxResultCount: 20,
        // includedType: "",
        // rankPreference: DISTANCE/RELEVANCE,
    }

    try {
        const rawResponse = await fetch(`${BASE_URL}`, {
            method: "POST",
            headers: requestHeader,
            body: JSON.stringify(requestBody)
        })

        const response = await rawResponse.json()

    } catch (error) {
        console.log(error)
    }
}

export async function fetchSpotViaV2Detail() {
    const BASE_URL = "https://places.googleapis.com/v1/places/"

    // サンプルのPlace_id
    const place_id = "ChIJb6HtSGeMGGARn8lCdfLfu7Q"

    const requestHeader = new Headers({
        'Content-Type': 'application/json',
        // FieldMaskに指定できる値は公式リファレンスを参照
        'X-Goog-FieldMask': 'displayName,formattedAddress,location,types',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
    })

    const queryParams =  new URLSearchParams({
        languageCode: "ja"
    })

    try {
        const rawResponse = await fetch(`${BASE_URL + place_id}?${queryParams}`, {
            method: "GET",
            headers: requestHeader,
        })

        const response = await rawResponse.json()

        console.log(response)
    } catch (error) {
        console.log(error)
    }
}