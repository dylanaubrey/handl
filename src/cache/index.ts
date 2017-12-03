import Cacheability from "cacheability";
import Cachemap from "cachemap";

import {
  DocumentNode,
  FieldNode,
  OperationDefinitionNode,
  print,
} from "graphql";

import {
  cloneDeep,
  get,
  isArray,
  isNumber,
  isObjectLike,
  isPlainObject,
} from "lodash";

import * as md5 from "md5";

import {
  AnalyzeResult,
  CacheArgs,
  CacheData,
  CheckDataObjectCacheEntryResult,
  CheckList,
  IterateChildFieldsCallback,
  KeyPaths,
  Keys,
  ObjectCacheCheckMetadata,
  PartialData,
} from "./types";

import { ClientResult, DefaultCacheControls } from "../client/types";
import mapToObject from "../helpers/map-to-object";
import mergeObjects from "../helpers/merging";

import {
  deleteChildFields,
  getAlias,
  getArguments,
  getChildFields,
  getName,
  getOperationDefinitions,
  hasChildFields,
} from "../helpers/parsing";

import { CacheMetadata, ObjectMap } from "../types";

export default class Cache {
  public static hash(value: string): string {
    return md5(value.replace(/\s/g, ""));
  }

  public static isValid(cacheability: Cacheability): boolean {
    const noCache = get(cacheability, ["metadata", "cacheControl", "noCache"], false);
    return cacheability && !noCache && cacheability.checkTTL();
  }

  private static _buildCacheKey(name: string, args: ObjectMap | void, cachePath: string, index?: number): string {
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
    const childFields = getChildFields(field) as FieldNode[] | void;
    if (!childFields) return false;

    for (let i = childFields.length - 1; i >= 0; i -= 1) {
      const childField = childFields[i];
      if (getName(childField) === "_metadata") continue; // eslint-disable-line no-continue
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

  private static _getKeys(field: FieldNode, paths?: KeyPaths, index?: number): Keys {
    const _paths = paths || {};
    const { cachePath = "", dataPath = "", queryPath = "" } = _paths;
    const name = getName(field) as string;
    const args = getArguments(field);
    const cacheKey = Cache._buildCacheKey(name, args, cachePath, index);
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
      const childFields = getChildFields(field) as FieldNode[] | void;
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

      if (get(objectFieldData._metadata, ["cacheControl"])) {
        const cacheability = new Cacheability();
        cacheability.parseCacheControl(objectFieldData._metadata.cacheControl);
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
    metadata: ObjectCacheCheckMetadata,
    cacheData: ObjectMap,
    cachePath?: string,
    queryPath?: string,
    index?: number,
  ) {
    const { name, propKey, queryKey } = Cache._getKeys(field, { cachePath, queryPath }, index);
    const cacheDataValue = cacheData[name];
    const { checkList, counter, queriedData } = metadata;
    Cache._setCheckList(checkList, cacheDataValue, queryKey);
    Cache._setCounter(counter, cacheDataValue);
    Cache._setQueriedData(queriedData, cacheDataValue, propKey);
  }

  private static _setCacheEntryMetadata(
    metadata: ObjectCacheCheckMetadata,
    cacheData: CacheData | void,
    cacheability: Cacheability | boolean,
    { propKey, queryKey }: Keys,
  ): void {
    const { cacheMetadata, checkList, counter, queriedData } = metadata;
    Cache._setCacheMetadata(cacheMetadata, cacheability, queryKey);
    Cache._setCheckList(checkList, cacheData, queryKey);
    Cache._setCounter(counter, cacheData);
    Cache._setQueriedData(queriedData, cacheData, propKey);
  }

  private static _setCacheMetadata(
    cacheMetadata: CacheMetadata,
    cacheability: Cacheability | boolean,
    queryKey: string,
  ): void {
    if (cacheMetadata.has(queryKey) || !Cache.isValid(cacheability)) return;
    cacheMetadata.set(queryKey, cacheability);
    const queryCacheability = cacheMetadata.get("query");

    if (!queryCacheability || queryCacheability.metadata.ttl > cacheability.metadata.ttl) {
      cacheMetadata.set("query", cacheability);
    }
  }

  private static _setCheckList(checkList: CheckList, cacheData: CacheData | void, queryKey: string): void {
    if (checkList.has(queryKey)) return;
    checkList.set(queryKey, cacheData !== undefined);
  }

  private static _setCounter(counter: { missing: number, total: number }, cacheData: CacheData | void): void {
    counter.total += 1;
    if (cacheData === undefined) counter.missing += 1;
  }

  private static _setQueriedData(queriedData: ObjectMap, cacheData: CacheData | void, propKey: string | number): void {
    if (!isObjectLike(cacheData) && cacheData !== undefined) {
      queriedData[propKey] = cacheData as string | number | boolean | null;
    } else if (isObjectLike(cacheData)) {
      const objectLikeCacheData = cacheData as ObjectMap | any[];
      queriedData[propKey] = isArray(objectLikeCacheData) ? [] : {};
    }
  }

  private _dataObjects: Cachemap;
  private _defaultCacheControls: DefaultCacheControls;
  private _partials: Map<string, PartialData>;
  private _responses: Cachemap;

  constructor({ cachemapOptions = {}, defaultCacheControls }: CacheArgs) {
    this._dataObjects = new Cachemap(cachemapOptions.dataObjects);
    this._defaultCacheControls = defaultCacheControls;
    this._partials = new Map();
    this._responses = new Cachemap(cachemapOptions.responses);
  }

  get responses(): Cachemap {
    return this._responses;
  }

  get dataObjects(): Cachemap {
    return this._dataObjects;
  }

  /**
   *
   * @private
   * @param {Object} field
   * @param {Object} data
   * @param {Object} cacheMetadata
   * @param {string} cacheControl
   * @param {Object} [paths]
   * @param {number} [index]
   * @return {Promise}
   */
  public async _setObject(field, data, cacheMetadata, cacheControl, paths, index) {
    const {
      cacheKey, dataKey, hashKey, queryKey,
    } = this._getKeys(field, paths, index);
    const fieldData = cloneDeep(get(data, dataKey, null));
    if (!isObjectLike(fieldData)) return;
    let _cacheControl = cacheControl;
    const metadata = cacheMetadata.get(queryKey);
    if (metadata) _cacheControl = metadata.printCacheControl();

    this._iterateChildFields(field, fieldData, (childField, childIndex) => {
      this._setObjectHashKey(fieldData, dataKey, cacheKey, childField, childIndex);

      this._setObject(
        childField,
        data,
        cacheMetadata,
        _cacheControl,
        { cachePath: cacheKey, dataPath: dataKey, queryPath: queryKey },
        childIndex,
      );
    });

    this._obj.set(hashKey, fieldData, { cacheHeaders: { cacheControl: _cacheControl } });
  }

  /**
   *
   * @private
   * @param {Object} data
   * @param {string} dataPath
   * @param {string} cachePath
   * @param {Object} field
   * @param {number} index
   * @return {void}
   */
  public _setObjectHashKey(data, dataPath, cachePath, field, index) {
    if (!unwrapInlineFragments(getChildFields(field)).length) return;
    const { hashKey, propKey } = this._getKeys(field, { cachePath, dataPath }, index);
    data[propKey] = { _HashKey: hashKey };
  }

  /**
   *
   * @private
   * @param {Document} ast
   * @param {Object} data
   * @param {Map} cacheMetadata
   * @return {Promise}
   */
  public async _updateObjectCache(ast, data, cacheMetadata) {
    const queryCache = cacheMetadata.get("query");

    getRootFields(ast, (field) => {
      this._setObject(field, data, cacheMetadata, queryCache.printCacheControl());
    });
  }

  public async analyze(hash: string, ast: DocumentNode): Promise<AnalyzeResult> {
    const {
      cacheMetadata,
      checkList,
      counter,
      queriedData,
    } = await this._checkDataObjectCache(ast);

    if (counter.missing === counter.total) {
      return { updatedAST: ast, updatedQuery: print(ast) };
    }

    if (!counter.missing) return { cachedData: queriedData, cacheMetadata };
    this._partials.set(hash, { cacheMetadata, cachedData: queriedData });
    await Cache._filterQuery(ast, checkList);
    return { filtered: true, updatedAST: ast, updatedQuery: print(ast) };
  }

  public async resolve(
    query: string,
    ast: DocumentNode,
    hash: string,
    data: ObjectMap,
    cacheMetadata: CacheMetadata,
    opts: { filtered: boolean },
  ): Promise<ClientResult> {
    if (opts.filtered) {
      const filteredHash = Cache.hash(query);
      const filteredCacheMetadata = this._updateCacheMetadata(ast, data, cacheMetadata);

      this._responses.set(filteredHash, { cacheMetadata: mapToObject(filteredCacheMetadata), data }, {
        cacheHeaders: { cacheControl: filteredCacheMetadata.get("query").printCacheControl() },
      });
    }

    const partial = this._getPartial(hash);
    let _data = data;

    if (partial) {
      _data = mergeObjects(partial.cachedData, data, (key, val) => {
        return isPlainObject(val) && val.id ? val.id : false;
      });
    }

    const _cacheMetadata = this._updateCacheMetadata(
      ast,
      _data,
      cacheMetadata,
      partial && partial.cacheMetadata,
    );

    this._responses.set(hash, { cacheMetadata: mapToObject(_cacheMetadata), data: _data }, {
      cacheHeaders: { cacheControl: _cacheMetadata.get("query").printCacheControl() },
    });

    this._updateObjectCache(ast, _data, _cacheMetadata);
    return { cacheMetadata: _cacheMetadata, data: _data };
  }

  private async _checkDataObjectCache(ast: DocumentNode): Promise<ObjectCacheCheckMetadata> {
    const metadata: ObjectCacheCheckMetadata = {
      cacheMetadata: new Map(),
      checkList: new Map(),
      counter: { missing: 0, total: 0 },
      queriedData: {},
    };

    const queryNode = getOperationDefinitions(ast, "query")[0];
    const fields = getChildFields(queryNode) as FieldNode[];
    const promises: Array<Promise<void>> = [];

    await Promise.all(fields.map((field) => {
      promises.push(this._parseField(field, metadata));
    }));

    return metadata;
  }

  private async _checkDataObjectCacheEntry(hashKey: string): Promise<CheckDataObjectCacheEntryResult> {
    const cacheability = await this._dataObjects.has(hashKey);
    let cacheData;
    if (Cache.isValid(cacheability)) cacheData = await this._dataObjects.get(hashKey);
    return { cacheability, cacheData };
  }

  private _getPartial(hash: string): PartialData | void {
    if (!this._partials.has(hash)) return;
    const partialData = this._partials.get(hash);
    this._partials.delete(hash);
    return partialData;
  }

  private async _parseField(
    field: FieldNode,
    metadata: ObjectCacheCheckMetadata,
    cacheData?: CacheData,
    cachePath?: string,
    queryPath?: string,
    index?: number,
  ): Promise<void> {
    if (hasChildFields(field)) {
      await this._parseParentField(field, metadata, cachePath, queryPath, index);
    } else {
      const objectMapCacheData = cacheData as ObjectMap;
      await Cache._parseSingleField(field, metadata, objectMapCacheData, cachePath, queryPath, index);
    }
  }

  private async _parseParentField(
    field: FieldNode,
    metadata: ObjectCacheCheckMetadata,
    cachePath?: string,
    queryPath?: string,
    index?: number,
  ): Promise<void> {
    const { cacheKey, hashKey, propKey, queryKey } = Cache._getKeys(field, { cachePath, queryPath }, index);
    const { cacheability, cacheData } = await this._checkDataObjectCacheEntry(hashKey);
    Cache._setCacheEntryMetadata(metadata, cacheData, cacheability, { propKey, queryKey });
    if (!isObjectLike(cacheData)) return;
    const objectLikeCacheData = cacheData as ObjectMap | any[];
    const { cacheMetadata, checkList, counter, queriedData } = metadata;
    const promises: Array<Promise<void>> = [];

    Cache._iterateChildFields(field, objectLikeCacheData, (childField, childIndex) => {
      if (getName(childField) === "_metadata") return;

      promises.push(this._parseField(
        childField,
        { cacheMetadata, checkList, counter, queriedData: queriedData[propKey] },
        objectLikeCacheData,
        cacheKey,
        queryKey,
        childIndex,
      ));
    });

    await Promise.all(promises);
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

      if (queryCacheability && queryCacheability.metadata.ttl < partialCacheability.metadata.ttl) {
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
}
