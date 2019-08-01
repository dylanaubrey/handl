> **[Documentation](README.md)**

## Index

### Classes

* [Subscribe](classes/subscribe.md)

### Interfaces

* [SubscribeArgs](interfaces/subscribeargs.md)
* [UserOptions](interfaces/useroptions.md)

### Type aliases

* [ConstructorOptions](README.md#constructoroptions)
* [GraphQLSubscribe](README.md#graphqlsubscribe)
* [InitOptions](README.md#initoptions)

### Functions

* [init](README.md#init)

## Type aliases

###  ConstructorOptions

Ƭ **ConstructorOptions**: *[UserOptions](interfaces/useroptions.md)*

*Defined in [defs/index.ts:38](https://github.com/badbatch/graphql-box/blob/22b398c/packages/subscribe/src/defs/index.ts#L38)*

___

###  GraphQLSubscribe

Ƭ **GraphQLSubscribe**: *function*

*Defined in [defs/index.ts:40](https://github.com/badbatch/graphql-box/blob/22b398c/packages/subscribe/src/defs/index.ts#L40)*

#### Type declaration:

▸ <**TData**>(`args`: object): *`Promise<AsyncIterator<ExecutionResult<TData>> | ExecutionResult<TData>>`*

**Type parameters:**

▪ **TData**

**Parameters:**

▪ **args**: *object*

Name | Type |
------ | ------ |
`contextValue?` | any |
`document` | `DocumentNode` |
`fieldResolver?` | `Maybe<GraphQLFieldResolver<any, any>>` |
`operationName?` | `Maybe<string>` |
`rootValue?` | any |
`schema` | `GraphQLSchema` |
`subscribeFieldResolver?` | `Maybe<GraphQLFieldResolver<any, any>>` |
`variableValues?` | `Maybe<object>` |

___

###  InitOptions

Ƭ **InitOptions**: *[UserOptions](interfaces/useroptions.md)*

*Defined in [defs/index.ts:36](https://github.com/badbatch/graphql-box/blob/22b398c/packages/subscribe/src/defs/index.ts#L36)*

## Functions

###  init

▸ **init**(`userOptions`: [UserOptions](interfaces/useroptions.md)): *`SubscriptionsManagerInit`*

*Defined in [main/index.ts:88](https://github.com/badbatch/graphql-box/blob/22b398c/packages/subscribe/src/main/index.ts#L88)*

**Parameters:**

Name | Type |
------ | ------ |
`userOptions` | [UserOptions](interfaces/useroptions.md) |

**Returns:** *`SubscriptionsManagerInit`*