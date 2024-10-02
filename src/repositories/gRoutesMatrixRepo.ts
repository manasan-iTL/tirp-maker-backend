import { GOOGLE_PLACES_API_KEY } from "src/const/google";
import { v2RouteSpot, v2RoutesReq } from "src/types";

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

class GRoutesMatrixRepo {

    private GOOGLE_API_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
    private original_spots: v2RouteSpot[] = []


    constructor(args: v2RoutesReq) {
        const { originSpot, waypoints, destinationSpot } = args;
        this.original_spots = [originSpot, ...waypoints, destinationSpot]
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
            return []
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
    public convertLocationObj(spots: v2RoutesReq) {
        const origin: Location = { 
            location: {
                latLng: {
                    latitude: spots.originSpot.location.latitude,
                    longitude: spots.originSpot.location.longitude
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
                    latitude: spots.destinationSpot.location.latitude,
                    longitude: spots.destinationSpot.location.longitude
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
}


export default GRoutesMatrixRepo