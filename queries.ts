import sushiData from '@sushiswap/sushi-data'

const pageResults = require('graph-results-pager');

// To be changed when the sushiswap subgraph is fixed
const graphAPIEndpoints = {
	masterchef: 'https://api.thegraph.com/subgraphs/name/lufycz/masterchef-vesting',
    //masterchef: 'https://api.thegraph.com/subgraphs/name/sushiswap/master-chef',
    vesting: "https://api.thegraph.com/subgraphs/name/lufycz/sushiclaimedvesting",
	blocklytics: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks'
};

type Info = sushiData.masterchef.Info;

type Pools = sushiData.masterchef.Pool[];

type Claims = sushiData.vesting.User[];

type Users = {
    poolId: number, 
    address: string, 
    amount: number, 
    rewardDebt: bigint, 
    sushiHarvested: number
}[];

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

    // Probably should add it to sushi-data
    async users(block_number: number): Promise<Users> {
        return pageResults({
            api: graphAPIEndpoints.masterchef,
            query: {
                entity: 'users',
                selection: {
                    block: {number: block_number},
                },
                properties: [
                    'id',
                    'address',
                    'amount',
                    'rewardDebt',
                    'sushiHarvested',
                ],
            },
        })
            .then(results =>
                results.map(({ id, address, amount, rewardDebt, sushiHarvested }) => ({
                    poolId: Number(id.split("-")[0]),
                    address: String(address),
                    amount: Number(amount),
                    rewardDebt: BigInt(rewardDebt),
                    sushiHarvested: Number(sushiHarvested),
                })),
            )
            .catch(err => console.log(err));
    },
}
