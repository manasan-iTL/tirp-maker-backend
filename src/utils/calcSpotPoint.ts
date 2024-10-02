import { Spot, v2ReqSpot } from "src/types";

interface Coordinates {
    latitude: number;
    longitude: number;
  }

interface Rectangle {
    high: Coordinates,
    low: Coordinates
}

class CalcSpotPoint {
    
    public calcReqtanglePoint(spot: v2ReqSpot) : Rectangle {
        const { lat, lng } = spot.location
        const bearings = [45, 225] // 北東(high) 南西(low)
        const distance = 25000 // 50kn

        const results = bearings.map((bearing) => this._calculateDestinationPoint(lat, lng, distance, bearing))

        return {
            high: results[0],
            low: results[1]
        }
    }

    private _calculateDestinationPoint(lat: number, lon: number, distance: number, bearing: number): Coordinates {
        const R = 6371e3; // 地球の半径（メートル）
        const φ1 = lat * Math.PI/180; // 緯度をラジアンに変換
        const λ1 = lon * Math.PI/180; // 経度をラジアンに変換
        const θ = bearing * Math.PI/180; // 方位をラジアンに変換
        const δ = distance / R; // 距離をラジアンに変換
      
        const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
        const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
      
        return {
          latitude: φ2 * 180/Math.PI,
          longitude: λ2 * 180/Math.PI
        };
      }
}

export default CalcSpotPoint