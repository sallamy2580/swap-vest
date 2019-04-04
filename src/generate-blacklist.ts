import { Command } from "commander";
import fs from "fs";
const axios = require('axios');
import { providers } from 'ethers'

import { MULTISIGS, etherscanKey, alchemyKey } from "./constants";

const program = new Command();

let provider = new providers.JsonRpcProvider('https://eth-mainnet.alchemyapi.io/v2/' + alchemyKey)

type Options = {
    input: string,
    limit: bigint
};

type Contract = {
    contract: string,
    balance: bigint,
    name: string
}

program
    .requiredOption('-i, --input <string>')
    .requiredOption('-l, --limit <number>')

program.parse(process.argv);

main();

async function main() {
    const options: Options = {
        input: String(program.opts().input),
        limit: BigInt(program.opts().limit)
    }

    const input = JSON.parse(fs.readFileSync(options.input, 'utf-8'));
    
    const cleaned: string[] = [];

    Object.keys(input).forEach(entry => {
        if(input[entry] > options.limit && !MULTISIGS.includes(entry)) {
            cleaned.push(entry)
        }
    })

    const contracts: Contract[] = [];

    for(const address of await filterContracts(cleaned)) {
        contracts.push({
            contract: address!,
            balance: BigInt(input[address!]),
            name: await getContractName(address!)
        })
    }

    console.log(contracts)

    fs.writeFileSync('./src/blacklist.json', (
        JSON.stringify(contracts.map(contract => contract['contract']), null, 2)
    ))
};


async function filterContracts(addresses: string[]) {
    const queries: Promise<string | undefined>[] = [];

    for(const address of addresses) {
        queries.push(
            isContract(address).then(bool => {
                if(bool) {
                    return address;
                }
            })
        )
    }

    return (await Promise.all(queries))
        .filter(entry => entry ? true : false)
}



async function isContract(address: string) {
    let code = await provider.getCode(address)
        if(code !== '0x') {
            return true;
        }
    return false;
}



async function getContractName(address: string) {
    return await axios.get('https://api.etherscan.io/api?module=contract&action=getsourcecode&address=' + address + '&apikey=' + etherscanKey)
        .then(response => {
            return response.data.result[0].ContractName
        })
        .catch(error => {
            console.log(error);
    });
}