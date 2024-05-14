/*
    Google Place API v" HTTP client
*/ 

import { GOOGLE_PLACES_API_KEY } from "src/const/google"
import { PlacesResponse } from "src/types"

export async function fetchSpotsTextSearch(keyword: string, max_result: number, places?: string): Promise<PlacesResponse | undefined> {
    const BASE_URL = "https://places.googleapis.com/v1/places:searchText"

    const requestHeader = new Headers({
        'Content-Type': 'application/json',
        // FieldMaskに指定できる値は公式リファレンスを参照
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.userRatingCount,places.rating',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
    })

    const requestBody = {
        // 必須のパラメーター
        textQuery: keyword,

        // これ以降はオプションのパラメーター
        languageCode: "ja",
        pageSize: max_result,
        // includedType: "",
        // strictTypeFiltering: boolean,
        // locationBias: {},
        locationRestriction: {
            rectangle: {
                low: {
                    latitude: 33.26353087503276,
                    longitude: 130.29738183846877
                },
                high: {
                    latitude: 34.01832911706793,
                    longitude: 130.4890733211295
                }
            }
        },
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

        return rawResponse.json()

        // return response
    } catch (error) {
        console.log(error)
        return undefined
    }
}