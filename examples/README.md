# Fluvio Client Node Examples

## Setup To run any of these examples make sure you've got a valid node setup:

If you clone this repository navigate to this directory in the repository and run:
```node
npm init -y
npm install -D typescript ts-node @types/node
npm install -S @fluvio/client
```

To run the a given example do `npx ts-node ./<name-of-example>.ts` such as:
* `npx ts-node ./consume.ts`
* `npx ts-node ./createTopic.ts`
* `npx ts-node ./deleteTopic.ts`
* `npx ts-node ./findTopic.ts`
* `npx ts-node ./iterator.ts`
* `npx ts-node ./produce.ts`
* `npx ts-node ./produceBatch.ts`
