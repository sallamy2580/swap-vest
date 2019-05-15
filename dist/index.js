"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sushi_data_1 = __importDefault(require("@sushiswap/sushi-data"));
const parse_balance_map_1 = require("./parse-balance-map");
const queries_1 = __importDefault(require("./queries"));
const constants_1 = require("./constants");
const redirects_json_1 = __importDefault(require("./redirects.json"));
const blacklist_json_1 = __importDefault(require("./blacklist.json"));
async function getDistribution(options) {
    var _a, _b;
    options.startBlock = (_a = options.startBlock) !== null && _a !== void 0 ? _a : constants_1.VESTING_START;
    options.claimBlock = (_b = options.claimBlock) !== null && _b !== void 0 ? _b : (await sushi_data_1.default.blocks.latestBlock()).number;
    // Fetch the data and redirect the addresses right away
    const data = redirect(await fetchData(options.startBlock, options.endBlock, options.claimBlock));
    const final = finalize(consolidate(data.beginning, options.startBlock), consolidate(data.end, options.endBlock), calculateTotalVested(data, options), data.end.claims);
    return {
        amounts: final.users,
        blacklisted: final.blacklisted,
        merkle: parse_balance_map_1.parseBalanceMap(final.users)
    };
}
exports.default = getDistribution;
async function fetchData(startBlock, endBlock, claimBlock) {
    const [infoBeginning, infoEnd, poolsBeginning, poolsEnd, usersBeginning, usersEnd, claimed] = await Promise.all([
        queries_1.default.info(startBlock), queries_1.default.info(endBlock),
        queries_1.default.pools(startBlock), queries_1.default.pools(endBlock),
        queries_1.default.users(startBlock), queries_1.default.users(endBlock),
        queries_1.default.claims(claimBlock)
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
function redirect(data) {
    data.beginning.users.forEach(user => {
        var _a, _b;
        user.address = (_b = (_a = redirects_json_1.default.find(redirect => user.address === redirect.from)) === null || _a === void 0 ? void 0 : _a.to) !== null && _b !== void 0 ? _b : user.address;
    });
    data.end.users.forEach(user => {
        var _a, _b;
        user.address = (_b = (_a = redirects_json_1.default.find(redirect => user.address === redirect.from)) === null || _a === void 0 ? void 0 : _a.to) !== null && _b !== void 0 ? _b : user.address;
    });
    return data;
}
// Removes duplicate and calculates balances
function consolidate(data, block) {
    const [users, pools, totalAllocPoint] = [data.users, data.pools, data.info.totalAllocPoint];
    // May run multiple times for one address if it's in multiple pools
    const consolidated = users.map(user => {
        const userPools = users
            .filter(u => user.address === u.address)
            .filter(u => u.poolId !== constants_1.VESTING_POOL_ID);
        const pending = userPools.reduce((a, b) => {
            return a + pendingSushi(block, totalAllocPoint, pools, b);
        }, 0);
        const harvested = userPools.reduce((a, b) => a + b.sushiHarvested, 0);
        return ({
            address: user.address,
            amount: pending + harvested
        });
    });
    // Removes duplicates
    return consolidated
        .filter((v, i, a) => a.findIndex(t => (t.address === v.address)) === i);
}
function finalize(usersBeginning, usersEnd, totalVested, claims) {
    const users = usersEnd.map(userEnd => {
        var _a, _b;
        return ({
            address: userEnd.address,
            amount: userEnd.amount - ((_b = (_a = usersBeginning.find(usersBeginning => usersBeginning.address === userEnd.address)) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : 0)
        });
    });
    const totalFarmed = users.reduce((a, b) => a + b.amount, 0);
    const fraction = totalVested / totalFarmed;
    console.log("totalFarmed: ", totalFarmed, "\ntotalVested: ", totalVested, "\nfraction: ", fraction);
    return {
        users: users
            .filter(user => user.amount >= 1e-18)
            .filter(user => !blacklist_json_1.default.includes(user.address))
            .map(user => {
            var _a, _b;
            const vested = user.amount * fraction;
            const claimed = (_b = (_a = claims.find(u => user.address === u.id)) === null || _a === void 0 ? void 0 : _a.totalClaimed) !== null && _b !== void 0 ? _b : 0;
            return ({
                address: user.address,
                vested: BigInt(Math.floor((vested - claimed) * 1e18))
            });
        })
            .filter(user => user.vested >= BigInt(0))
            .map(user => ({ [user.address]: String(user.vested) }))
            .reduce((a, b) => ({ ...a, ...b }), {}),
        blacklisted: users
            .filter(user => user.amount >= 1e-18)
            .filter(user => blacklist_json_1.default.includes(user.address))
            .map(user => {
            var _a, _b;
            const vested = user.amount * fraction;
            const claimed = (_b = (_a = claims.find(u => user.address === u.id)) === null || _a === void 0 ? void 0 : _a.totalClaimed) !== null && _b !== void 0 ? _b : 0;
            return ({
                address: user.address,
                vested: BigInt(Math.floor((vested - claimed) * 1e18))
            });
        })
            .filter(user => user.vested >= BigInt(0))
            .map(user => ({ [user.address]: String(user.vested) }))
            .reduce((a, b) => ({ ...a, ...b }), {}),
    };
}
function calculateTotalVested(data, options) {
    const [startBlock, endBlock] = [options.startBlock, options.endBlock];
    const vestedStart = data.beginning.users
        .filter(user => user.poolId === constants_1.VESTING_POOL_ID)
        .map(user => {
        const pending = pendingSushi(startBlock, data.beginning.info.totalAllocPoint, data.beginning.pools, user);
        const harvested = user.sushiHarvested;
        return pending + harvested;
    })
        .reduce((a, b) => a + b, 0);
    const vestedEnd = data.end.users
        .filter(user => user.poolId === constants_1.VESTING_POOL_ID)
        .map(user => {
        const pending = pendingSushi(endBlock, data.end.info.totalAllocPoint, data.end.pools, user);
        const harvested = user.sushiHarvested;
        return pending + harvested;
    })
        .reduce((a, b) => a + b, 0);
    return vestedEnd - vestedStart;
}
// Re-implementation of the pendingSushi function from Masterchef
function pendingSushi(block, totalAllocPoint, pools, user) {
    let poolId = user.poolId;
    let pool = pools.filter((entry) => entry.id === poolId ? true : false)[0]; // There's only going to be one
    let accSushiPerShare = pool.accSushiPerShare;
    if (block > pool.lastRewardBlock && pool.slpBalance !== 0) {
        let multiplier = block - pool.lastRewardBlock;
        let sushiReward = BigInt(Math.floor(multiplier * 100 * 1e18 * pool.allocPoint / totalAllocPoint));
        accSushiPerShare = accSushiPerShare + sushiReward * BigInt(1e12) / BigInt(Math.floor(pool.slpBalance * 1e18));
    }
    return Number((BigInt(user.amount) * accSushiPerShare - user.rewardDebt * BigInt(1e12)) / BigInt(1e12)) / 1e18;
}
