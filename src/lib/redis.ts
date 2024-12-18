import { createClient } from "redis";

const redisClient = process.env.REDIS_HOST ? 
    createClient({
        socket: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT)
        }
    })
    :createClient({
        url: process.env.REDIS_URL
    })

export default redisClient