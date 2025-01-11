import { averageStayByPlaceType } from "src/const/averageStay";
import { PlaceType } from "src/const/placeTypes";

export function calcAverageStayTime(types:string[]): number {

    if (types.includes(PlaceType.depature)) return averageStayByPlaceType.depature

    if (types.includes(PlaceType.destination)) return averageStayByPlaceType.destination
    
    if (types.includes(PlaceType.eating)) return averageStayByPlaceType.eating

    if (types.includes(PlaceType.hotel)) return averageStayByPlaceType.hotel

    if (types.includes(PlaceType.amusementPark)) return averageStayByPlaceType.amusementPark

    if (types.includes(PlaceType.themePark)) return averageStayByPlaceType.themePark

    if (types.includes(PlaceType.hiking)) return averageStayByPlaceType.hiking

    if (types.includes(PlaceType.NaturalScenery)) return averageStayByPlaceType.NaturalScenery

    if (types.includes(PlaceType.marineSports)) return averageStayByPlaceType.marineSports

    if (types.includes(PlaceType.snowSports)) return averageStayByPlaceType.snowSports

    if (types.includes(PlaceType.famousPlaces)) return averageStayByPlaceType.famousPlaces

    if (types.includes(PlaceType.MuseumArtGallery)) return averageStayByPlaceType.MuseumArtGallery

    if (types.includes(PlaceType.craft)) return averageStayByPlaceType.craft

    if (types.includes(PlaceType.TraditionalCraft)) return averageStayByPlaceType.TraditionalCraft

    if (types.includes(PlaceType.factory)) return averageStayByPlaceType.factory

    if (types.includes(PlaceType.zoo)) return averageStayByPlaceType.zoo

    if (types.includes(PlaceType.aquarium)) return averageStayByPlaceType.aquarium

    return 60 * 60
}