import express, { Request, Response } from 'express';
import { v2SearchSpots } from 'src/types';
// /api 以下のルーティング
export const apiRouter = express.Router();

apiRouter.get('/', async (req: Request<unknown, unknown, v2SearchSpots>, res: Response) => {
});

