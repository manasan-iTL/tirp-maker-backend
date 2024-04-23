import { DirectionsRequest, TravelMode } from "@googlemaps/google-maps-services-js"
import { BasicInfo, Spot } from "src/types"

export const createDirectionRequest = (key: string, basicInfo: BasicInfo, originSpot: Spot | undefined, destinationSpot: Spot | undefined, spots: Spot[]) => {

        if (originSpot === undefined || destinationSpot === undefined) throw new Error("No Origin!!!")
        
        const directionRequest: DirectionsRequest = {
            params: {
                origin: originSpot.location,
                destination: destinationSpot.location,
                waypoints: [],
                mode: basicInfo.transportion === "CAR"? TravelMode.driving: TravelMode.transit,
                optimize: true,
                region: "ja", 
                key: key,
            }
        } 
        
        for (let i = 0;  i < spots.length; i++) {
            // if ( i == spots.length - 1) continue
            directionRequest.params.waypoints?.push(spots[i].location)
        }

        return directionRequest
}