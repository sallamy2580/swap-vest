import sushiData from '@sushiswap/sushi-data';
import { parseBalanceMap } from './parse-balance-map'

import queries from './queries';

import { VESTING_POOL_ID, VESTING_START } from "./constants";
import redirects from './redirects.json';
import blacklist from './blacklist.json';

type Info = sushiData.masterchef.Info;

type Pools = sushiData.masterchef.Pool[];

type Claims = sushiData.vesting.User[];

type User = sushiData.masterchef.User;

type UsersConsolidated = {
    address: string,
    amount: number
}[];

type Options = {
    startBlock: number | undefined,
    endBlock: number,
    claimBlock: number | undefined
};

type DataPart = {
    info: Info,
    pools: Pools,
    users: User[],
    claims: Claims
};

type Data = {
    beginning: DataPart,
    end: DataPart
};

export default async function getDistribution(options: Options) {
    options.startBlock = options.startBlock ?? VESTING_START;
    options.claimBlock = options.claimBlock ?? (await sushiData.blocks.latestBlock()).number;

    // Fetch the data and redirect the addresses right away
    const data = redirect(await fetchData(options.startBlock, options.endBlock, options.claimBlock));
    const final = finalize(
        consolidate(data.beginning, options.startBlock),
        consolidate(data.end, options.endBlock),
        calculateTotalVested(data, options),
        data.end.claims
    );

    return {
        amounts: final.users,
        blacklisted: final.blacklisted,
        merkle: parseBalanceMap(final.users)
    };
}

async function fetchData(startBlock: number, endBlock: number, claimBlock: number) {
    const [
        infoBeginning, infoEnd,
        poolsBeginning, poolsEnd,
        usersBeginning, usersEnd,
        claimed
    ] = await Promise.all([
        queries.info(startBlock), queries.info(endBlock),
        queries.pools(startBlock), queries.pools(endBlock),
        queries.users(startBlock), queries.users(endBlock),
        queries.claims(claimBlock)
    ]);

    return ({
        beginning: {
            info: infoBeginning,
            pools: poolsBeginning,
            users: usersBeginning,
            claims: []
        },

        end: {
            info: infoEnd,
            pools: poolsEnd,
            users: usersEnd,
            claims: claimed
        }
    });
}

// Redirects addresses
function redirect(data: Data) {
    data.beginning.users.forEach(user => {
        user.address = redirects.find(redirect => user.address === redirect.from)?.to ?? user.address;
    });
    data.end.users.forEach(user => {
        user.address = redirects.find(redirect => user.address === redirect.from)?.to ?? user.address;
    });
    return data;
}

// Removes duplicate and calculates balances
function consolidate(data: DataPart, block: number) {
    const [users, pools, totalAllocPoint] = [data.users, data.pools, data.info.totalAllocPoint];

    // May run multiple times for one address if it's in multiple pools
    const consolidated: UsersConsolidated = users.map(user => {
        const userPools = users
            .filter(u => user.address === u.address)
            .filter(u => u.poolId !== VESTING_POOL_ID)

        const pending = userPools.reduce((a, b) => {
            return a + pendingSushi(block, totalAllocPoint, pools, b)
        }, 0)

        const harvested = userPools.reduce((a, b) => a + b.sushiHarvested, 0);

        return ({
            address: user.address,
            amount: pending + harvested
        });
    });

    // Removes duplicates
    return consolidated
        .filter((v,i,a) => a.findIndex(t => (t.address === v.address)) === i);
}

function finalize(usersBeginning: UsersConsolidated, usersEnd: UsersConsolidated, totalVested: number, claims: Claims) {
    const users = usersEnd.map(userEnd => {
        return ({
            address: userEnd.address,
            amount: userEnd.amount - (usersBeginning.find(usersBeginning => usersBeginning.address === userEnd.address)?.amount ?? 0)
        })
    });

    const totalFarmed = users.reduce((a, b) => a + b.amount, 0);

    const fraction = totalVested / totalFarmed;

    console.log(
        "totalFarmed: ", totalFarmed,
        "\ntotalVested: ", totalVested,
        "\nfraction: ", fraction
    )

    return {
        users: users
            .filter(user => user.amount >= 1e-18)
            .filter(user => !blacklist.includes(user.address))
            .map(user => {
                const vested = user.amount * fraction;

                const claimed = claims.find(u => user.address === u.id)?.totalClaimed ?? 0;

                return ({
                    [user.address]: String(BigInt(Math.floor((vested - claimed) * 1e18)))
                })
            })
            .reduce((a, b) => ({...a, ...b}), {}),

        blacklisted: users
            .filter(user => user.amount >= 1e-18)
            .filter(user => blacklist.includes(user.address))
            .map(user => {
                const vested = user.amount * fraction;

                const claimed = claims.find(u => user.address === u.id)?.totalClaimed ?? 0;

                return ({
                    [user.address]: String(BigInt(Math.floor((vested - claimed) * 1e18)))
                })
            })
            .reduce((a, b) => ({...a, ...b}), {}),
    }
}

function calculateTotalVested(data: Data, options: Options) {
    const [startBlock, endBlock] = [options.startBlock, options.endBlock];

    const vestedStart = data.beginning.users
        .filter(user => user.poolId === VESTING_POOL_ID)
        .map(user => {
            const pending = pendingSushi(startBlock!, data.beginning.info.totalAllocPoint, data.beginning.pools, user);
            const harvested = user.sushiHarvested;
            return pending + harvested;
        })
        .reduce((a, b) => a + b, 0);

    const vestedEnd = data.end.users
        .filter(user => user.poolId === VESTING_POOL_ID)
        .map(user => {
            const pending = pendingSushi(endBlock, data.end.info.totalAllocPoint, data.end.pools, user);
            const harvested = user.sushiHarvested;
            return pending + harvested;
        })
        .reduce((a, b) => a + b, 0);

    return vestedEnd - vestedStart;
}

// Re-implementation of the pendingSushi function from Masterchef
function pendingSushi(block: number, totalAllocPoint: number, pools: Pools, user: User) {
    let poolId = user.poolId;
    let pool = pools.filter((entry) => entry.id === poolId ? true : false)[0]; // There's only going to be one

    let accSushiPerShare = pool.accSushiPerShare;
    if(block > pool.lastRewardBlock && pool.slpBalance !== 0) {
        let multiplier = block - pool.lastRewardBlock;
        let sushiReward = BigInt(Math.floor(multiplier * 100 * 1e18 * pool.allocPoint / totalAllocPoint));
        accSushiPerShare = accSushiPerShare + sushiReward * BigInt(1e12) / BigInt(Math.floor(pool.slpBalance * 1e18));
    }

    return Number(
        (BigInt(user.amount) * accSushiPerShare - user.rewardDebt * BigInt(1e12)) / BigInt(1e12)
    ) / 1e18;
}