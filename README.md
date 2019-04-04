# sushi-vesting-query

This is a script that fetches the pending and harvested Sushi at the specified blocks, and then calculates the resulting vested Sushi.

Run
```
yarn

yarn run standalone -s <startBlock> -e <endBlock> -c <claimBlock>
```

Resulting files will be under the /outputs folder

## Options
`-s` - Start Block, defaults to 10959148 (vesting start), defines the start of the period of the calculation

`-e` - End Block, required, defines the end of the period of the calculation

`-c` - Claim Block, default to current block height, defines the block of the snapshot of claimed amounts

## Blacklist was generated like this:
```
yarn run standalone -e 12148193

yarn run generate-blacklist -l 6666666666666666666666 -i outputs/amounts-10959148-12148193.json
```

To replicate, make sure to start with a clean blacklist (`[]`), otherwise you'll get an empty output from `generate-blacklist`.