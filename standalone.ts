import { Command } from "commander";
import fs from "fs";
import sushiData from '@sushiswap/sushi-data';

import getDistribution from './index';
import { VESTING_START } from "./constants";

const program = new Command();

type Options = {
    startBlock: number,
    endBlock: number,
    claimBlock: number
};

program
    .option('-s, --startBlock <number>')
    .requiredOption('-e, --endBlock <number>')
    .option('-c, --claimBlock <number>')

program.parse(process.argv);

main();

async function main() {
    const options: Options = {
        startBlock: Number(program.opts().startBlock ?? VESTING_START),
        endBlock: Number(program.opts().endBlock),
        claimBlock: Number(program.opts().claimBlock ?? undefined)//await sushiData.utils.timestampToBlock(Date.now())) - will enable when subgraph switches to mainnet
    }

    fs.writeFileSync(
        `./outputs/${options.startBlock}-${options.endBlock}.json`,//-${options.claimBlock}}`, - will enable when subgraph switches to mainnet
        JSON.stringify(
            await getDistribution(options), null, 1
        )
    );
};