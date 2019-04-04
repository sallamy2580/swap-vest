"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const axios = require('axios');
const ethers_1 = require("ethers");
const constants_1 = require("./constants");
const program = new commander_1.Command();
let provider = new ethers_1.providers.JsonRpcProvider('https://eth-mainnet.alchemyapi.io/v2/' + constants_1.alchemyKey);
program
    .requiredOption('-i, --input <string>')
    .requiredOption('-l, --limit <number>');
program.parse(process.argv);
main();
async function main() {
    const options = {
        input: String(program.opts().input),
        limit: BigInt(program.opts().limit)
    };
    const input = JSON.parse(fs_1.default.readFileSync(options.input, 'utf-8'));
    const cleaned = [];
    Object.keys(input).forEach(entry => {
        if (input[entry] > options.limit && !constants_1.MULTISIGS.includes(entry)) {
            cleaned.push(entry);
        }
    });
    const contracts = [];
    for (const address of await filterContracts(cleaned)) {
        contracts.push({
            contract: address,
            balance: BigInt(input[address]),
            name: await getContractName(address)
        });
    }
    console.log(contracts);
    fs_1.default.writeFileSync('./src/blacklist.json', (JSON.stringify(contracts.map(contract => contract['contract']), null, 2)));
}
;
async function filterContracts(addresses) {
    const queries = [];
    for (const address of addresses) {
        queries.push(isContract(address).then(bool => {
            if (bool) {
                return address;
            }
        }));
    }
    return (await Promise.all(queries))
        .filter(entry => entry ? true : false);
}
async function isContract(address) {
    let code = await provider.getCode(address);
    if (code !== '0x') {
        return true;
    }
    return false;
}
async function getContractName(address) {
    return await axios.get('https://api.etherscan.io/api?module=contract&action=getsourcecode&address=' + address + '&apikey=' + constants_1.etherscanKey)
        .then(response => {
        return response.data.result[0].ContractName;
    })
        .catch(error => {
        console.log(error);
    });
}
