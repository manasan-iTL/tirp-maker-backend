import { GOOGLE_PLACES_API_KEY } from "src/const/google";
import { ApiError } from "src/error/CustomError";
import { v2ReqSpot, v2RoutesReq } from "src/types";

interface genBodyRequestArgs {
    locations: Location[],
}

interface Location {
    location: {
        latLng: {
            latitude: number,
            longitude: number
        }
    }
}

interface origin {
    waypoint: Location,
    routeModifiers?: {}
}

interface destination {
    waypoint: Location
}

interface RouteMatrixReqBody {
    origins: origin[],
    destinations: destination[],
    travelMode?: string,
    routingPreference?: string,
    departureTime?: string,
    arrivalTime?: string,
    languageCode?: string,
}

export interface RouteMatrixResBody {
    status: string,
    condition: string,
    distanceMeters: number,
    duration: string,
    originIndex: number,
    destinationIndex: number
}

interface RouteReq {
    origin: v2ReqSpot, 
    waypoints: v2ReqSpot[], 
    destination: v2ReqSpot
}

class GRoutesMatrixRepo {

    private GOOGLE_API_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
    private original_spots: v2ReqSpot[] = []


    constructor(args: RouteReq) {
        const { origin, waypoints, destination } = args;
        this.original_spots = [origin, ...waypoints, destination]
    }

    /**
     * requestRouteMatrix
     */
    public async requestRouteMatrix(body: RouteMatrixReqBody): Promise<RouteMatrixResBody[]> {
        const requestHeader = new Headers({
            'Content-Type': 'application/json',
            // FieldMaskに指定できる値は公式リファレンスを参照
            'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
        })

        try {
            const rawResponse = await fetch(this.GOOGLE_API_URL, {
                headers: requestHeader,
                body: JSON.stringify(body),
                method: "POST"
            })

            const response: RouteMatrixResBody[]  = await rawResponse.json()

            return response
        } catch (error) {
            console.log("error", error)
            throw new ApiError('交通情報の取得に失敗し、プランが生成できませんでした。別の条件でお試しください')
        }        
    }

    /**
     * genBodyRequest
     */
    public genBodyRequest(args: genBodyRequestArgs): RouteMatrixReqBody {

        const origins: origin[] = args.locations.map(location => {
            return {
                waypoint: location,
            }
        })

        const destination: destination[] = args.locations.map(location => {
            return {
                waypoint: location
            }
        })

        return {
            origins: origins,
            destinations: destination,
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            languageCode: "ja"
        }
    }

    /**
     * genReqBody
     * 
     */
    public convertLocationObj(spots: RouteReq) {
        const origin: Location = { 
            location: {
                latLng: {
                    latitude: spots.origin.location.latitude,
                    longitude: spots.origin.location.longitude
                }
            }
        }

        const waypoints: Location[] = spots.waypoints.map(waypoint => {
            return {
                location: {
                    latLng: {
                        latitude: waypoint.location.latitude,
                        longitude: waypoint.location.longitude
                    }
                }
            }
        })

        const destination: Location = { 
            location: {
                latLng: {
                    latitude: spots.destination.location.latitude,
                    longitude: spots.destination.location.longitude
                }
            }
        }

        return [origin, ...waypoints, destination]
    }

    /**
     * getOriginalSpots
     */
    public getOriginalSpots() {
        return this.original_spots
    }

    static async fetchMoveTime(origin: v2ReqSpot, destination: v2ReqSpot) {
        const GOOGLE_API_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
        const locations = [origin.location, destination.location]

        const origins: origin[] = locations.map(location => {
            return {
                waypoint: {
                    location: {
                        latLng: location
                    }
                },
            }
        })

        const destinations: destination[] = locations.map(location => {
            return {
                waypoint: {
                    location: {
                        latLng: location
                    }
                },
            }
        })

        const reqBody = {
            origins: origins,
            destinations: destinations,
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            languageCode: "ja"
        }

        const requestHeader = new Headers({
            'Content-Type': 'application/json',
            // FieldMaskに指定できる値は公式リファレンスを参照
            'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
        })

        try {
            const rawResponse = await fetch(GOOGLE_API_URL, {
                headers: requestHeader,
                body: JSON.stringify(reqBody),
                method: "POST"
            })
    
            const response: RouteMatrixResBody[]  = await rawResponse.json()
    
            return response
        } catch (error) {
            throw new ApiError('交通情報の取得に失敗し、プランが生成できませんでした。別の条件でお試しください')
        }
    }       
}


export default GRoutesMatrixRepo