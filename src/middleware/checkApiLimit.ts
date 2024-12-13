import { Request, Response, NextFunction } from "express";
import { RATE_COUNT } from "src/const/rate";
import { ApiRateLimit } from "src/error/CustomError";

export const checkSessionCount = (req: Request, res: Response, next: NextFunction) => {
    console.log(req.session.rateCount)
    if (req.session && req.session.rateCount !== undefined) {
      if (req.session.rateCount >= RATE_COUNT) {
        throw new ApiRateLimit('使用制限がかかりました。翌日以降まで使用できません。')
      }
    }
    
    next();
};