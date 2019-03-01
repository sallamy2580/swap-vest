import sushiData from '@sushiswap/sushi-data';
declare type Info = sushiData.masterchef.Info;
declare type Pools = sushiData.masterchef.Pool[];
declare type Claims = sushiData.vesting.User[];
declare type Users = sushiData.masterchef.User[];
declare const _default: {
    info(block_number: number): Promise<Info>;
    pools(block_number: number): Promise<Pools>;
    claims(block_number?: number | undefined): Promise<Claims>;
    users(block_number: number): Promise<Users>;
};
export default _default;
