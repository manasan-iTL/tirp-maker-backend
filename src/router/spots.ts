import express, { Request, Response } from 'express';
import { v2SearchSpots } from 'src/types';
import { generateRecommendedRoutes } from 'src/utils/combineSpots';
import { fetchSpotsViaV2TextSearch } from 'src/utils/extrack';
import { sortSpotsByRatings } from 'src/utils/sort';
// /api 以下のルーティング
export const apiRouter = express.Router();

apiRouter.get('/', async (req: Request<unknown, unknown, v2SearchSpots>, res: Response) => {

    // const reqBody = req.body

    // Condition
    const eating = "福岡 おすすめの食事";
    const recommend = "福岡 名所";
    const hotel = "福岡 温泉";

    // area
    const area = req.body.area ?? "福岡"



    try {
        // ユーザーが食事について希望があればそのキーワードを元にSearch
        // デフォルトは「場所 おすすめの食事」
        console.log("食事場所");
        const eatingSpots = await fetchSpotsViaV2TextSearch(eating);

        // ユーザーのやりたいことに応じて、各キーワード毎にリクエストを発行する（上限3回）
        console.log("おすすめの観光スポット")
        const recommendSpots = await fetchSpotsViaV2TextSearch(recommend);

        console.log("おすすめのホテル")
        const hotelSpots = await fetchSpotsViaV2TextSearch(hotel);

        // それぞれのデータをソートする
        const sortedEatingSpots = sortSpotsByRatings(eatingSpots)
        const sortedRecommendSpots = sortSpotsByRatings(recommendSpots)
        const sortedHotelSpots = sortSpotsByRatings(hotelSpots)

        console.log("ソートした結果")
        console.log(sortedEatingSpots, sortedHotelSpots)

        // 複数通りの旅行プランを生成する
        const combineSpots = generateRecommendedRoutes(sortedRecommendSpots, sortedEatingSpots, sortedHotelSpots)

        console.log("組み合わせたプラン")
        console.log(combineSpots)
        
        res.json({ 
            status: "success",
            data: {
                combineSpots
            }
         });

    } catch (error) {
        console.log(error)
    }
    
});

