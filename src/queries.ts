import sushiData from '@sushiswap/sushi-data'

type Info = sushiData.masterchef.Info;

type Pools = sushiData.masterchef.Pool[];

type Claims = sushiData.vesting.User[];

type Users = sushiData.masterchef.User[];

export default {
    async info(block_number: number): Promise<Info> {   
        return await sushiData.masterchef.info({block: block_number});
    },

    async pools(block_number: number): Promise<Pools> {
        return await sushiData.masterchef.pools({block: block_number});
    },
    
    async claims(block_number?: number): Promise<Claims> {
        return await sushiData.vesting.users({block: block_number})
    },

    async users(block_number: number): Promise<Users> {
        return await sushiData.masterchef.users({block: block_number});
    }
}
