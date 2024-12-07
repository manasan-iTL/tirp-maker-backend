import 'express-session';
import { IFetchAllRecommendSpot } from 'src/repositories/gPlacesRepo';
import { Place, PlacesResponse, v2ReqSpot } from 'src/types';
import { V2ReqSpotWithTheme } from 'src/utils/combineSpots';

declare module 'express-session' {
    interface SessionData {
      wantDo?: string[];
      wantedPlace: v2ReqSpot,
      recommends?: V2ReqSpotWithTheme[],
      eatingSpots?: v2ReqSpot[]
    }
}