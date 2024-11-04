import 'express-session';
import { IFetchAllRecommendSpot } from 'src/repositories/gPlacesRepo';
import { Place } from 'src/types';

declare module 'express-session' {
    interface SessionData {
      wantDo?: string[];
      recommends?: IFetchAllRecommendSpot[]
    }
}