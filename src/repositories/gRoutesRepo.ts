import { LoadFnOutput } from "module";
import { GOOGLE_PLACES_API_KEY } from "src/const/google";
import { v2ReqSpot, v2SearchSpots } from "src/types";

interface Location {
    location: {
        latLng: {
            latitude: number,
            longitude: number
        }
    }
}

interface PlaceId {
    placeId: string;
}

interface Address {
    address: string
}

interface RouteReqBody {
    origin: Location | PlaceId | Address,
    destination: Location | PlaceId | Address,
    travelMode: "DRIVE" | "WALK" | "BICYCLE",
    languageCode: string
} 

interface RouteResBody {
    routes: {
        duration: string,
        distanceMeters: string,
    }[]
}

class GRouteRepo {

    private REQUEST_URI = "https://routes.googleapis.com/directions/v2:computeRoutes"

    private async _fetchRoute(args: RouteReqBody): Promise<RouteResBody | null> {
        const headers = new Headers({
            'Content-Type': 'application/json',
            // FieldMaskに指定できる値は公式リファレンスを参照
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
        })

        try {
            const rawRequest = await fetch(this.REQUEST_URI, {
                method: "POST",
                body: JSON.stringify(args),
                headers
            })

            const response: RouteResBody = await rawRequest.json();

            return response
        } catch (error) {
            console.log(error)
            return null
        }
    }

    private _genRouteReqBody(args: { origin: v2ReqSpot, destination: v2ReqSpot }): RouteReqBody {
        const { origin, destination } = args;

        const originLocation : Location | Address = 
            (origin.location.latitude !== 0 && origin.location.longitude !== 0) ?
            {
                location: {
                    latLng: origin.location
                }
            }:
            { 
                address: origin.spotName
            }
        
        const destinationLocation = 
            (destination.location.latitude && destination.location.longitude) ?
            {
                location: {
                    latLng: destination.location
                }
            }:
            { 
                address: destination.spotName
            }

            return {
                origin: originLocation,
                destination: destinationLocation,
                travelMode: "DRIVE",
                languageCode: "ja"
            }
    }

    /**
     * getRouteDuration
     */
    public async getRouteDuration(args: { origin: v2ReqSpot, destination: v2ReqSpot }) {
        const requestBody = this._genRouteReqBody(args);
        const response = await this._fetchRoute(requestBody);
        return response
    }
}

export default GRouteRepo;