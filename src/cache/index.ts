import Cacheability from "cacheability";
import createCachemap, { Cachemap } from "cachemap";

import {
  DocumentNode,
  FieldNode,
  print,
} from "graphql";

import {
  cloneDeep,
  get,
  has,
  isArray,
  isNumber,
  isObjectLike,
  isPlainObject,
  isString,
} from "lodash";

import * as md5 from "md5";

import {
  AnalyzeResult,
  CacheArgs,
  CacheEntryCacheability,
  CacheEntryData,
  CacheEntryResult,
  CachesCheckMetadata,
  CheckList,
  GetKeysResult,
  IterateChildFieldsCallback,
  KeyPaths,
  PartialData,
} from "./types";

import {
  CachemapArgsGroup,
  CacheMetadata,
  DataCachedResolver,
  DefaultCacheControls,
  FieldTypeInfo,
  FieldTypeMap,
  ObjectMap,
  ResolveResult,
} from "../types";

import mapToObject from "../helpers/map-to-object";
import mergeObjects from "../helpers/merge-objects";

import {
  deleteChildFields,
  getAlias,
  getArguments,
  getChildFields,
  getName,
  getOperationDefinitions,
  hasChildFields,
} from "../helpers/parsing";

export default class Cache {
  public static async create(args: CacheArgs): Promise<Cache> {
    const cache = new Cache(args);
    await cache._createCachemaps();
    return cache;
  }

  public static hash(value: string): string {
    return md5(value.replace(/\s/g, ""));
  }

  public static isValid(cacheability: Cacheability): boolean {
    const noCache = get(cacheability, ["metadata", "cacheControl", "noCache"], false);
    return cacheability && !noCache && cacheability.checkTTL();
  }

  private static _buildCacheKey(name: string, cachePath: string, args?: ObjectMap, index?: number): string {
    let key = `${isNumber(index) ? index : name}`;
    if (args) key = `${key}(${JSON.stringify(args)})`;
    return Cache._buildKey(key, cachePath);
  }

  private static _buildKey(key: string | number, path: string): string {
    const paths: Array<string | number> = [];
    if (path.length) paths.push(path);
    paths.push(key);
    return paths.join(".");
  }

  private static _filterField(field: FieldNode, checkList: CheckList, queryPath: string): boolean {
    const childFields = getChildFields(field) as FieldNode[] | undefined;
    if (!childFields) return false;

    for (let i = childFields.length - 1; i >= 0; i -= 1) {
      const childField = childFields[i];
      if (getName(childField) === "_metadata") continue;
      const { queryKey } = this._getKeys(childField, { queryPath });
      const check = checkList.get(queryKey);

      if (check && !hasChildFields(childField)) {
        deleteChildFields(field, childField);
      } else if (check && Cache._filterField(childField, checkList, queryKey)) {
        deleteChildFields(field, childField);
      }
    }

    return !hasChildFields(field);
  }

  private static async _filterQuery(ast: DocumentNode, checkList: CheckList): Promise<void> {
    const queryNode = getOperationDefinitions(ast, "query")[0];
    const fields = getChildFields(queryNode) as FieldNode[];

    for (let i = fields.length - 1; i >= 0; i -= 1) {
      const field = fields[i];
      const { queryKey } = Cache._getKeys(field);
      if (Cache._filterField(field, checkList, queryKey)) deleteChildFields(queryNode, field);
    }
  }

  private static _getKeys(field: FieldNode, paths: KeyPaths = {}, index?: number): GetKeysResult {
    const { cachePath = "", dataPath = "", queryPath = "" } = paths;
    const name = getName(field) as string;
    const args = getArguments(field);
    const cacheKey = Cache._buildCacheKey(name, cachePath, args, index);
    const hashKey = Cache.hash(cacheKey);
    const nameKey = getAlias(field) || name;
    const queryKey = isNumber(index) ? queryPath : Cache._buildKey(nameKey, queryPath);
    const propKey = isNumber(index) ? index : nameKey;
    const dataKey = Cache._buildKey(propKey, dataPath);
    return { cacheKey, dataKey, hashKey, name, propKey, queryKey };
  }

  private static _iterateChildFields(
    field: FieldNode,
    data: ObjectMap | any[],
    callback: IterateChildFieldsCallback,
  ): void {
    if (!isArray(data)) {
      const childFields = getChildFields(field) as FieldNode[] | undefined;
      if (!childFields) return;

      childFields.forEach((child) => {
        callback(child);
      });
    } else {
      data.forEach((value, index) => {
        callback(field, index);
      });
    }
  }

  private static _parseResponseMetadata(
    field: FieldNode,
    data: ObjectMap,
    cacheMetadata: CacheMetadata,
    dataPath?: string,
    queryPath?: string,
    index?: number,
  ): void {
    const { dataKey, queryKey } = Cache._getKeys(field, { dataPath, queryPath }, index);
    const fieldData = get(data, dataKey, null);
    if (!isObjectLike(fieldData)) return;
    const objectLikeFieldData = fieldData as ObjectMap | any[];

    if (Object.prototype.hasOwnProperty.call(objectLikeFieldData, "_metadata")) {
      const objectFieldData = objectLikeFieldData as ObjectMap;

      if (has(objectFieldData, ["_metadata", "cacheControl"]) && isString(objectFieldData._metadata.cacheControl)) {
        const cacheControl: string = objectFieldData._metadata.cacheControl;
        const cacheability = new Cacheability();
        cacheability.parseCacheControl(cacheControl);
        Cache._setCacheMetadata(cacheMetadata, cacheability, queryKey);
      }

      delete objectFieldData._metadata;
    }

    Cache._iterateChildFields(field, objectLikeFieldData, (childField, childIndex) => {
      Cache._parseResponseMetadata(childField, data, cacheMetadata, dataKey, queryKey, childIndex);
    });
  }

  private static async _parseSingleField(
    field: FieldNode,
    metadata: CachesCheckMetadata,
    cacheData: CacheEntryData,
    cachePath?: string,
    queryPath?: string,
    index?: number,
  ) {
    const { name, propKey, queryKey } = Cache._getKeys(field, { cachePath, queryPath }, index);
    let cacheDataValue: string | number | boolean | null | undefined;

    if (isPlainObject(cacheData.dataPath) && cacheData.dataPath[name]) {
      cacheDataValue = cacheData.dataPath[name];
    } else if (isPlainObject(cacheData.dataEntity) && cacheData.dataEntity[name]) {
      cacheDataValue = cacheData.dataEntity[name];
    }

    const { checkList, counter, queriedData } = metadata;
    Cache._setCheckList(checkList, { dataPath: cacheDataValue }, queryKey);
    Cache._setCounter(counter, { dataPath: cacheDataValue });
    Cache._setQueriedData(queriedData, { dataPath: cacheDataValue }, propKey);
  }

  private static _setCacheEntryMetadata(
    metadata: CachesCheckMetadata,
    cacheData: CacheEntryData,
    cacheability: CacheEntryCacheability,
    { propKey, queryKey }: { propKey: string | number, queryKey: string },
  ): void {
    const { cacheMetadata, checkList, counter, queriedData } = metadata;
    Cache._setCacheMetadata(cacheMetadata, cacheability.dataPath, queryKey);
    Cache._setCheckList(checkList, cacheData, queryKey);
    Cache._setCounter(counter, cacheData);
    Cache._setQueriedData(queriedData, cacheData, propKey);
  }

  private static _setCacheMetadata(
    cacheMetadata: CacheMetadata,
    cacheability: Cacheability | false,
    queryKey: string,
  ): void {
    if (cacheMetadata.has(queryKey) || !cacheability || !Cache.isValid(cacheability)) return;
    cacheMetadata.set(queryKey, cacheability);
    const queryCacheability = cacheMetadata.get("query");

    if (!queryCacheability) {
      cacheMetadata.set("query", cacheability);
      return;
    }

    if (queryCacheability.metadata.ttl > cacheability.metadata.ttl) {
      cacheMetadata.set("query", cacheability);
    }
  }

  private static _setCheckList(checkList: CheckList, cacheData: CacheEntryData, queryKey: string): void {
    if (checkList.has(queryKey)) return;
    const data = cacheData.dataPath || cacheData.dataEntity;
    checkList.set(queryKey, data !== undefined);
  }

  private static _setCounter(counter: { missing: number, total: number }, cacheData: CacheEntryData): void {
    const data = cacheData.dataPath || cacheData.dataEntity;
    counter.total += 1;
    if (data === undefined) counter.missing += 1;
  }

  private static _setObjectHashKey(
    field: FieldNode,
    data: ObjectMap | any[],
    cachePath: string,
    dataPath: string,
    index?: number,
  ): void {
    if (!hasChildFields(field)) return;
    const { hashKey, propKey } = this._getKeys(field, { cachePath, dataPath }, index);

    if (isArray(data) && isNumber(propKey)) {
      data[propKey] = { _HashKey: hashKey };
    } else if (isPlainObject(data) && isString(propKey)) {
      const objData = data as ObjectMap;
      objData[propKey] = { _HashKey: hashKey };
    }
  }

  private static _setQueriedData(queriedData: ObjectMap, cacheData: CacheEntryData, propKey: string | number): void {
    const data = cacheData.dataPath || cacheData.dataEntity;

    if (!isObjectLike(data) && data !== undefined) {
      queriedData[propKey] = data as string | number | boolean | null;
    } else if (isObjectLike(data)) {
      const objectLikeData = data as ObjectMap | any[];
      queriedData[propKey] = isArray(objectLikeData) ? [] : {};
    }
  }

  private _cachemapOptions: CachemapArgsGroup;
  private _dataEntities: Cachemap;
  private _dataPaths: Cachemap;
  private _defaultCacheControls: DefaultCacheControls;
  private _partials: Map<string, PartialData>;
  private _responses: Cachemap;

  constructor({ cachemapOptions, defaultCacheControls }: CacheArgs) {
    this._cachemapOptions = cachemapOptions;
    this._defaultCacheControls = defaultCacheControls;
    this._partials = new Map();
  }

  get responses(): Cachemap {
    return this._responses;
  }

  get dataEntities(): Cachemap {
    return this._dataEntities;
  }

  get dataPaths(): Cachemap {
    return this._dataPaths;
  }

  public async analyze(
    queryHash: string,
    ast: DocumentNode,
    fieldTypeMap: FieldTypeMap,
  ): Promise<AnalyzeResult> {
    const {
      cacheMetadata,
      checkList,
      counter,
      queriedData,
    } = await this._checkDataCaches(ast, fieldTypeMap);

    if (counter.missing === counter.total) {
      return { filtered: false, updatedAST: ast, updatedQuery: print(ast) };
    }

    if (!counter.missing) return { cachedData: queriedData, cacheMetadata };
    this._partials.set(queryHash, { cacheMetadata, cachedData: queriedData });
    await Cache._filterQuery(ast, checkList);
    return { filtered: true, updatedAST: ast, updatedQuery: print(ast) };
  }

  public async resolve(
    query: string,
    ast: DocumentNode,
    queryHash: string,
    data: ObjectMap,
    cacheMetadata: CacheMetadata,
    opts: { cacheResolve: DataCachedResolver, filtered: boolean },
  ): Promise<ResolveResult> {
    const partial = this._getPartial(queryHash);
    let updatedData = data;

    if (partial) {
      updatedData = mergeObjects(partial.cachedData, data, (key: string, val: any): string | undefined => {
        if (isPlainObject(val) && val.id) return val.id;
        return undefined;
      });
    }

    const defaultCacheControl = this._defaultCacheControls.query;

    const updatedCacheMetadata = this._updateCacheMetadata(
      ast,
      updatedData,
      cacheMetadata,
      partial && partial.cacheMetadata,
    );

    const updatedCacheability = updatedCacheMetadata.get("query");
    const updatedCacheControl = updatedCacheability && updatedCacheability.printCacheControl() || defaultCacheControl;

    const filterCacheMetadata = opts.filtered && this._updateCacheMetadata(ast, data, cacheMetadata);
    const filterCacheability = filterCacheMetadata && filterCacheMetadata.get("query");
    const filterCacheControl = filterCacheability && filterCacheability.printCacheControl() || defaultCacheControl;

    (async () => {
      const promises: Array<Promise<void>> = [];

      promises.push(this._responses.set(
        queryHash,
        { cacheMetadata: mapToObject(updatedCacheMetadata), data: updatedData },
        { cacheHeaders: { cacheControl: updatedCacheControl },
      }));

      promises.push(this._updateObjectCache(ast, updatedData, updatedCacheMetadata));

      if (filterCacheMetadata) {
        promises.push(this._responses.set(
          Cache.hash(query),
          { cacheMetadata: mapToObject(filterCacheMetadata), data },
          { cacheHeaders: { cacheControl: filterCacheControl },
        }));
      }

      await Promise.all(promises);
      opts.cacheResolve();
    })();

    return { cacheMetadata: updatedCacheMetadata, data: updatedData };
  }

  private async _checkDataCaches(
    ast: DocumentNode,
    fieldTypeMap: FieldTypeMap,
  ): Promise<CachesCheckMetadata> {
    const metadata: CachesCheckMetadata = {
      cacheMetadata: new Map(),
      checkList: new Map(),
      counter: { missing: 0, total: 0 },
      queriedData: {},
    };

    const queryNode = getOperationDefinitions(ast, "query")[0];
    const fields = getChildFields(queryNode) as FieldNode[];
    await Promise.all(fields.map((field) => this._parseField(field, metadata, fieldTypeMap)));
    return metadata;
  }

  private async _checkDataPathCacheEntry(hashKey: string): Promise<CacheEntryResult> {
    const cacheability = await this._dataPaths.has(hashKey);
    let cachedData;
    if (cacheability && Cache.isValid(cacheability)) cachedData = await this._dataPaths.get(hashKey);
    return { cacheability, cachedData };
  }

  private async _checkDataEntityCacheEntry(
    fieldTypeInfo: FieldTypeInfo,
    cachedPathData?: ObjectMap,
  ): Promise<CacheEntryResult | undefined> {
    const { resourceKey, resourceValue, typeName } = fieldTypeInfo;
    let pathDataResourceValue: string | number | undefined;

    if (cachedPathData && isPlainObject(cachedPathData)) {
      pathDataResourceValue = cachedPathData[resourceKey];
    }

    if (!resourceValue && !pathDataResourceValue) return undefined;
    const key = `${typeName}:${resourceValue || pathDataResourceValue}`;
    const cacheability = await this._dataEntities.has(key);
    let cachedData: ObjectMap | undefined;
    if (cacheability && Cache.isValid(cacheability)) cachedData = await this._dataEntities.get(key);
    return { cacheability, cachedData };
  }

  private async _createCachemaps(): Promise<void> {
    this._dataEntities = await createCachemap(this._cachemapOptions.dataEntities);
    this._dataPaths = await createCachemap(this._cachemapOptions.dataPaths);
    this._responses = await createCachemap(this._cachemapOptions.responses);
  }

  private _getPartial(queryHash: string): PartialData | undefined {
    if (!this._partials.has(queryHash)) return undefined;
    const partialData = this._partials.get(queryHash);
    this._partials.delete(queryHash);
    return partialData;
  }

  private async _parseField(
    field: FieldNode,
    metadata: CachesCheckMetadata,
    fieldTypeMap: FieldTypeMap,
    cacheData?: CacheEntryData,
    cachePath?: string,
    queryPath?: string,
    index?: number,
  ): Promise<void> {
    if (hasChildFields(field)) {
      await this._parseParentField(field, metadata, fieldTypeMap, cachePath, queryPath, index);
    } else {
      const cacheEntryData = cacheData as CacheEntryData;
      await Cache._parseSingleField(field, metadata, cacheEntryData, cachePath, queryPath, index);
    }
  }

  private async _parseParentField(
    field: FieldNode,
    metadata: CachesCheckMetadata,
    fieldTypeMap: FieldTypeMap,
    cachePath?: string,
    queryPath?: string,
    index?: number,
  ): Promise<void> {
    const {
      cacheKey,
      dataKey,
      hashKey,
      propKey,
      queryKey,
    } = Cache._getKeys(field, { cachePath, queryPath }, index);

    const dataPathResult = await this._checkDataPathCacheEntry(hashKey);
    const cachedData: CacheEntryData = { dataPath: dataPathResult.cachedData };
    const cacheability: CacheEntryCacheability = { dataPath: dataPathResult.cacheability };

    if (fieldTypeMap.has(queryKey)) {
      const dataEntityResult = await this._checkDataEntityCacheEntry(
        fieldTypeMap.get(queryKey) as FieldTypeInfo,
        get(dataPathResult.cachedData, dataKey),
      );

      if (dataEntityResult) {
        cachedData.dataEntity = dataEntityResult.cachedData;
        cacheability.dataEntity = dataEntityResult.cacheability;
      }
    }

    Cache._setCacheEntryMetadata(metadata, cachedData, cacheability, { propKey, queryKey });
    if (!isObjectLike(cachedData.dataPath)) return;
    const objectLikeCachedData = cachedData.dataPath as ObjectMap | any[];
    const { cacheMetadata, checkList, counter, queriedData } = metadata;
    const promises: Array<Promise<void>> = [];

    Cache._iterateChildFields(field, objectLikeCachedData, (childField, childIndex) => {
      if (getName(childField) === "_metadata") return;

      promises.push(this._parseField(
        childField,
        { cacheMetadata, checkList, counter, queriedData: queriedData[propKey] },
        fieldTypeMap,
        cachedData,
        cacheKey,
        queryKey,
        childIndex,
      ));
    });

    await Promise.all(promises);
  }

  private async _setObject(
    field: FieldNode,
    data: ObjectMap | any[],
    cacheMetadata: CacheMetadata,
    cacheControl: string,
    paths?: KeyPaths,
    index?: number,
  ): Promise<void> {
    const { cacheKey, dataKey, hashKey, queryKey } = Cache._getKeys(field, paths, index);
    const fieldData = cloneDeep(get(data, dataKey, null));
    if (!isObjectLike(fieldData)) return;
    const objectLikeFieldData = fieldData as ObjectMap | any[];
    const metadata = cacheMetadata.get(queryKey);
    const _cacheControl = metadata && metadata.printCacheControl() || cacheControl;
    const promises: Array<Promise<void>> = [];

    Cache._iterateChildFields(field, objectLikeFieldData, (childField, childIndex) => {
      Cache._setObjectHashKey(childField, objectLikeFieldData, dataKey, cacheKey, childIndex);

      promises.push(this._setObject(
        childField,
        data,
        cacheMetadata,
        _cacheControl,
        { cachePath: cacheKey, dataPath: dataKey, queryPath: queryKey },
        childIndex,
      ));
    });

    await Promise.all(promises);
    await this._dataPaths.set(hashKey, fieldData, { cacheHeaders: { cacheControl: _cacheControl } });
  }

  private _updateCacheMetadata(
    ast: DocumentNode,
    data: ObjectMap,
    cacheMetadata: CacheMetadata,
    partialCacheMetadata?: CacheMetadata,
  ): CacheMetadata {
    let _cacheMetadata: CacheMetadata = new Map([...cacheMetadata]);

    if (partialCacheMetadata) {
      const queryCacheability = cacheMetadata.get("query");
      const partialCacheability = partialCacheMetadata.get("query");

      if (queryCacheability && partialCacheability
        && queryCacheability.metadata.ttl < partialCacheability.metadata.ttl) {
        _cacheMetadata = new Map([...partialCacheMetadata, ...cacheMetadata]);
      } else {
        _cacheMetadata = new Map([...cacheMetadata, ...partialCacheMetadata]);
      }
    }

    const queryNode = getOperationDefinitions(ast, "query")[0];
    const fields = getChildFields(queryNode) as FieldNode[];

    fields.forEach((field) => {
      Cache._parseResponseMetadata(field, data, _cacheMetadata);
    });

    if (!_cacheMetadata.has("query")) {
      const cacheability = new Cacheability();
      cacheability.parseCacheControl(this._defaultCacheControls.query);
      _cacheMetadata.set("query", cacheability);
    }

    return _cacheMetadata;
  }

  private async _updateObjectCache(ast: DocumentNode, data: ObjectMap, cacheMetadata: CacheMetadata): Promise<void> {
    const queryNode = getOperationDefinitions(ast, "query")[0];
    const fields = getChildFields(queryNode) as FieldNode[];
    const queryCacheability = cacheMetadata.get("query");

    await Promise.all(
      fields.map((field) => {
        const cacheControl = queryCacheability && queryCacheability.printCacheControl()
          || this._defaultCacheControls.query;

        return this._setObject(field, data, cacheMetadata, cacheControl);
      }),
    );
  }
}
