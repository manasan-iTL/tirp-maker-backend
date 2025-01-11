export const PlaceType = {
    hotel: "HOTEL",
    eating: "EATING",
    amusementPark: "AMUSEMENT_PARK",
    themePark: "THEME_PARK",
    hiking: "HIKING",
    NaturalScenery: "NATURAL_SCENERY",
    marineSports: "MARINE_SPORTS",
    snowSports: "SNOW_SPORTS",
    famousPlaces: "FAMOUS_PLACES",
    MuseumArtGallery: "MUSEUM_ART_GALLERY",
    craft: "CRAFT",
    TraditionalCraft: "TRADITIONAL_CRAFT",
    factory: "FACTORY",
    zoo: "ZOO",
    aquarium: "AQUARIUM", 
    depature: "DEPATURE",
    destination: "DESTINATION",
    must: "MUST",
}

export function convertJapanese(value: string): string {
    switch (value) {
        case PlaceType.themePark:
            return "テーマパーク"
    
        case PlaceType.amusementPark:
            return "遊園地"
        
        case PlaceType.hiking:
            return "ハイキング"
        
        case PlaceType.NaturalScenery:
            return "自然景観巡り"

        case PlaceType.marineSports:
            return "マリンスポーツ"

        case PlaceType.snowSports:
            return "スノースポーツ"
        
        case PlaceType.famousPlaces:
            return "名所めぐり"
        
        case PlaceType.MuseumArtGallery:
            return "博物館・美術館"
        
        case PlaceType.craft:
            return "クラフト"
        
        case PlaceType.TraditionalCraft:
            return "伝統工芸体験"
        
        case PlaceType.factory:
            return "工場見学"

        case PlaceType.zoo:
            return "動物園"
        
        case PlaceType.aquarium:
            return "水族館"
            
        default:
            return "おすすめの観光スポット"
    }
}


export function convertJapaneseToType(value: string): string {
    switch (value) {
        case "テーマパーク":
            return PlaceType.themePark
    
        case "遊園地":
            return PlaceType.amusementPark
        
        case "ハイキング":
            return PlaceType.hiking
        
        case "自然景観巡り":
            return PlaceType.NaturalScenery

        case "マリンスポーツ":
            return PlaceType.marineSports

        case "スノースポーツ":
            return PlaceType.snowSports
        
        case "名所めぐり":
            return PlaceType.famousPlaces
        
        case "博物館・美術館":
            return PlaceType.MuseumArtGallery
        
        case "クラフト":
            return PlaceType.craft
        
        case "伝統工芸体験":
            return PlaceType.TraditionalCraft
        
        case "工場見学":
            return PlaceType.factory

        case "動物園":
            return PlaceType.zoo
        
        case "水族館":
            return PlaceType.aquarium
            
        default:
            return PlaceType.famousPlaces
    }
}

export type TPlaceType = typeof PlaceType