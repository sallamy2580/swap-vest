"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const index_1 = __importDefault(require("./index"));
const constants_1 = require("./constants");
const program = new commander_1.Command();
program
    .option('-s, --startBlock <number>')
    .requiredOption('-e, --endBlock <number>')
    .option('-c, --claimBlock <number>');
program.parse(process.argv);
main();
async function main() {
    var _a, _b;
    const options = {
        startBlock: Number((_a = program.opts().startBlock) !== null && _a !== void 0 ? _a : constants_1.VESTING_START),
        endBlock: Number(program.opts().endBlock),
        claimBlock: Number((_b = program.opts().claimBlock) !== null && _b !== void 0 ? _b : undefined) //await sushiData.utils.timestampToBlock(Date.now())) - will enable when subgraph switches to mainnet
    };
    const distribution = await index_1.default(options);
    if (!fs_1.default.existsSync('./outputs')) {
        fs_1.default.mkdirSync('./outputs');
    }
    fs_1.default.writeFileSync(`./outputs/amounts-${options.startBlock}-${options.endBlock}.json`, //-${options.claimBlock}}`, - will enable when subgraph switches to mainnet
    JSON.stringify(distribution.amounts, null, 1));
    fs_1.default.writeFileSync(`./outputs/merkle-${options.startBlock}-${options.endBlock}.json`, //-${options.claimBlock}}`, - will enable when subgraph switches to mainnet
    JSON.stringify(distribution.merkle, null, 1));
}
;
