> **[Documentation](../README.md)**

[EventAsyncIterator](eventasynciterator.md) /

# Class: EventAsyncIterator

## Hierarchy

* **EventAsyncIterator**

## Index

### Constructors

* [constructor](eventasynciterator.md#constructor)

### Methods

* [getIterator](eventasynciterator.md#getiterator)

## Constructors

###  constructor

\+ **new EventAsyncIterator**(`eventEmitter`: `EventEmitter`, `eventName`: string): *[EventAsyncIterator](eventasynciterator.md)*

*Defined in [event-async-iterator/index.ts:10](https://github.com/badbatch/graphql-box/blob/22b398c/packages/helpers/src/event-async-iterator/index.ts#L10)*

**Parameters:**

Name | Type |
------ | ------ |
`eventEmitter` | `EventEmitter` |
`eventName` | string |

**Returns:** *[EventAsyncIterator](eventasynciterator.md)*

## Methods

###  getIterator

▸ **getIterator**(): *`AsyncIterator<MaybeRequestResult | undefined>`*

*Defined in [event-async-iterator/index.ts:19](https://github.com/badbatch/graphql-box/blob/22b398c/packages/helpers/src/event-async-iterator/index.ts#L19)*

**Returns:** *`AsyncIterator<MaybeRequestResult | undefined>`*