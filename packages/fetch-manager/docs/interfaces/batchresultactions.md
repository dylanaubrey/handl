> **[Documentation](../README.md)**

[BatchResultActions](batchresultactions.md) /

# Interface: BatchResultActions

## Hierarchy

* **BatchResultActions**

## Index

### Properties

* [reject](batchresultactions.md#reject)
* [resolve](batchresultactions.md#resolve)

## Properties

###  reject

• **reject**: *function*

*Defined in [defs/index.ts:55](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/defs/index.ts#L55)*

#### Type declaration:

▸ (`reason`: `Error` | `Error`[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`reason` | `Error` \| `Error`[] |

___

###  resolve

• **resolve**: *function*

*Defined in [defs/index.ts:56](https://github.com/badbatch/graphql-box/blob/22b398c/packages/fetch-manager/src/defs/index.ts#L56)*

#### Type declaration:

▸ (`value`: `MaybeRawResponseData`): *void*

**Parameters:**

Name | Type |
------ | ------ |
`value` | `MaybeRawResponseData` |