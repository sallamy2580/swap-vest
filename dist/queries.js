"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sushi_data_1 = __importDefault(require("@sushiswap/sushi-data"));
exports.default = {
    async info(block_number) {
        return await sushi_data_1.default.masterchef.info({ block: block_number });
    },
    async pools(block_number) {
        return await sushi_data_1.default.masterchef.pools({ block: block_number });
    },
    async claims(block_number) {
        return await sushi_data_1.default.vesting.users({ block: block_number });
    },
    async users(block_number) {
        return await sushi_data_1.default.masterchef.users({ block: block_number });
    }
};
