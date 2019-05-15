declare type Options = {
    startBlock?: number;
    endBlock: number;
    claimBlock?: number;
};
export default function getDistribution(options: Options): Promise<{
    amounts: {
        [x: string]: string;
    };
    blacklisted: {
        [x: string]: string;
    };
    merkle: import("./parse-balance-map").MerkleDistributorInfo;
}>;
export {};
