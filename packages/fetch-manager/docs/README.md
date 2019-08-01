> **[Documentation](README.md)**

## Index

### Classes

* [FetchManager](classes/fetchmanager.md)

### Interfaces

* [ActiveBatchValue](interfaces/activebatchvalue.md)
* [BatchActionsObjectMap](interfaces/batchactionsobjectmap.md)
* [BatchResultActions](interfaces/batchresultactions.md)
* [BatchedMaybeFetchData](interfaces/batchedmaybefetchdata.md)
* [FetchOptions](interfaces/fetchoptions.md)
* [MaybeRawFetchData](interfaces/mayberawfetchdata.md)
* [MaybeRawFetchDataObjectMap](interfaces/mayberawfetchdataobjectmap.md)
* [UserOptions](interfaces/useroptions.md)

### Type aliases

* [ActiveBatch](README.md#activebatch)
* [ConstructorOptions](README.md#constructoroptions)
* [InitOptions](README.md#initoptions)

### Variables

* [FETCH_EXECUTED](README.md#const-fetch_executed)
* [URL](README.md#const-url)

### Functions

* [init](README.md#init)
* [logFetch](README.md#logfetch)

## Type aliases

###  ActiveBatch

Ƭ **ActiveBatch**: *`Map<string, ActiveBatchValue>`*

*Defined in [defs/index.ts:47](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/defs/index.ts#L47)*

___

###  ConstructorOptions

Ƭ **ConstructorOptions**: *[UserOptions](interfaces/useroptions.md)*

*Defined in [defs/index.ts:41](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/defs/index.ts#L41)*

___

###  InitOptions

Ƭ **InitOptions**: *[UserOptions](interfaces/useroptions.md)*

*Defined in [defs/index.ts:39](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/defs/index.ts#L39)*

## Variables

### `Const` FETCH_EXECUTED

• **FETCH_EXECUTED**: *"fetch_executed"* = "fetch_executed"

*Defined in [consts/index.ts:1](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/consts/index.ts#L1)*

___

### `Const` URL

• **URL**: *"https://api.github.com/graphql"* = "https://api.github.com/graphql"

*Defined in [index.test.ts:11](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/index.test.ts#L11)*

## Functions

###  init

▸ **init**(`userOptions`: [UserOptions](interfaces/useroptions.md)): *`RequestManagerInit`*

*Defined in [main/index.ts:209](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/main/index.ts#L209)*

**Parameters:**

Name | Type |
------ | ------ |
`userOptions` | [UserOptions](interfaces/useroptions.md) |

**Returns:** *`RequestManagerInit`*

___

###  logFetch

▸ **logFetch**(): *`(Anonymous function)`*

*Defined in [debug/log-fetch/index.ts:4](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/debug/log-fetch/index.ts#L4)*

**Returns:** *`(Anonymous function)`*