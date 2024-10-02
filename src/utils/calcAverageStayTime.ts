import { averageStayByPlaceType } from "src/const/averageStay";
import { PlaceType } from "src/const/placeTypes";

export function calcAverageStayTime(types:string[]): number {

    if (types.includes(PlaceType.depature)) return averageStayByPlaceType.depature

    if (types.includes(PlaceType.destination)) return averageStayByPlaceType.destination
    
    if (types.includes(PlaceType.eating)) return averageStayByPlaceType.eating

    if (types.includes(PlaceType.sightseeing)) return averageStayByPlaceType.sightseeing

    if (types.includes(PlaceType.hotel)) return averageStayByPlaceType.hotel

    return 60 * 60
}