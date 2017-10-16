import Cacheability from 'cacheability';
import Cachemap from 'cachemap';
import { GraphQLUnionType, parse, print, TypeInfo, visit } from 'graphql';

import {
  cloneDeep,
  get,
  isArray,
  isNumber,
  isObjectLike,
  isPlainObject,
} from 'lodash';

import md5 from 'md5';
import mergeObjects from '../helpers/merging';

import {
  addChildField,
  buildCacheKey,
  buildDataKey,
  buildQueryKey,
  deleteChildField,
  getChildField,
  getChildFields,
  getFieldAlias,
  getFieldArguments,
  getKind,
  getName,
  getQuery,
  getRootField,
  getRootFields,
  getType,
  hasChildField,
  isParentField,
  mapToObject,
  unwrapInlineFragments,
} from '../helpers/parsing';

/**
 *
 * The cache
 */
export default class Cache {
  /**
   *
   * @constructor
   * @param {Object} config
   * @return {void}
   */
  constructor({
    /**
     * Optional configuration to be passed to the
     * cachemap modules.
     *
     * @type {Object}
     */
    cachemapOptions = { obj: {}, res: {} },
    /**
     * Optional default cache control for queries
     * and mutations.
     *
     * @type {Object}
     */
    defaultCacheControls = {
      mutation: 'max-age=0, s-maxage=0, no-cache, no-store',
      query: 'public, max-age=60, s-maxage=60',
    },
    /**
     * Identifier used as the key for each resource
     * requested from the server.
     *
     * @type {string}
     */
    resourceKey,
    /**
     * Graphql schema.
     *
     * @type {Schema}
     */
    schema,
  } = {}) {
    this._defaultCacheControls = defaultCacheControls;
    this._obj = new Cachemap(cachemapOptions.obj);
    this._partials = new Map();
    this._res = new Cachemap(cachemapOptions.res);
    this._resourceKey = resourceKey;
    this._schema = schema;
  }

  /**
   *
   * @return {Object}
   */
  get res() {
    return this._res;
  }

  /**
   *
   * @return {Object}
   */
  get obj() {
    return this._obj;
  }

  /**
   *
   * @private
   * @param {string} hashKey
   * @return {Promise}
   */
  async _checkCacheEntry(hashKey) {
    const cacheability = await this._obj.has(hashKey);
    let cachedData;
    if (this.cacheValid(cacheability)) cachedData = await this._obj.get(hashKey);
    return { cacheability, cachedData };
  }

  /**
   *
   * @private
   * @param {Document} ast
   * @return {Promise}
   */
  async _checkObjectCache(ast) {
    const metadata = {
      cache: new Map(),
      checkList: new Map(),
      counter: { missing: 0, total: 0 },
      queried: {},
    };

    const promises = [];

    getRootFields(ast, (field) => {
      promises.push(this._parseField(field, metadata));
    });

    await Promise.all(promises);
    return metadata;
  }

  /**
   *
   * @private
   * @param {Object} field
   * @param {Map} checkList
   * @param {string} queryPath
   * @return {boolean}
   */
  _filterField(field, checkList, queryPath) {
    const childFields = unwrapInlineFragments(getChildFields(field));

    for (let i = childFields.length - 1; i >= 0; i -= 1) {
      const child = childFields[i];
      const { queryKey } = this._getKeys(child, { queryPath });
      const check = checkList.get(queryKey);

      if (!isParentField(child) && check) {
        deleteChildField(field, child);
      } else if (check && this._filterField(child, checkList, queryKey)) {
        deleteChildField(field, child);
      }
    }

    return !isParentField(field);
  }

  /**
   *
   * @private
   * @param {Document} ast
   * @param {Object} checkList
   * @return {Promise}
   */
  async _filterQuery(ast, checkList) {
    const rootFields = getRootFields(ast);

    for (let i = rootFields.length - 1; i >= 0; i -= 1) {
      const field = rootFields[i];
      const queryField = getQuery(ast);
      const { queryKey } = this._getKeys(field);
      if (this._filterField(field, checkList, queryKey)) deleteChildField(queryField, field);
    }
  }

  /**
   *
   * @private
   * @param {Object} field
   * @param {Object} [paths]
   * @param {string} [paths.cachePath]
   * @param {string} [paths.dataPath]
   * @param {string} [paths.queryPath]
   * @param {number} [index]
   * @return {Object}
   */
  _getKeys(field, { cachePath, dataPath, queryPath } = {}, index) {
    const name = getName(field);
    const args = getFieldArguments(field);
    const cacheKey = buildCacheKey(name, index, args, cachePath);
    const hashKey = this.hash(cacheKey);
    const aliasKey = getFieldAlias(field);
    const nameKey = aliasKey || name;
    const queryKey = isNumber(index) ? queryPath : buildQueryKey(nameKey, queryPath);
    const propKey = isNumber(index) ? index : nameKey;
    const dataKey = buildDataKey(propKey, dataPath);
    return { cacheKey, dataKey, hashKey, name, propKey, queryKey };
  }

  /**
   *
   * @private
   * @param {string} hash
   * @return {Object}
   */
  _getPartial(hash) {
    if (!this._partials.has(hash)) return {};
    const partialData = this._partials.get(hash);
    this._partials.delete(hash);
    return partialData;
  }

  /**
   *
   * @private
   * @param {Document} field
   * @param {Object} data
   * @param {Function} callback
   * @return {void}
   */
  _iterateChildFields(field, data, callback) {
    if (!isArray(data)) {
      unwrapInlineFragments(getChildFields(field)).forEach((child) => {
        callback(child);
      });
    } else {
      data.forEach((value, index) => {
        callback(field, index);
      });
    }
  }

  /**
   *
   * @private
   * @param {Document} field
   * @param {Object} metadata
   * @param {Object} [cachedData]
   * @param {string} [cachePath]
   * @param {string} [queryPath]
   * @param {number} [index]
   * @return {Promise}
   */
  async _parseField(field, metadata, cachedData, cachePath, queryPath, index) {
    if (isParentField(field)) {
      await this._parseParentField(field, metadata, cachePath, queryPath, index);
    } else {
      await this._parseSingleField(field, metadata, cachedData, cachePath, queryPath, index);
    }
  }

  /**
   *
   * @private
   * @param {Document} field
   * @param {Object} metadata
   * @param {string} [cachePath]
   * @param {string} [queryPath]
   * @param {number} [index]
   * @return {Promise}
   */
  async _parseParentField(field, metadata, cachePath, queryPath, index) {
    const {
      cacheKey,
      hashKey,
      propKey,
      queryKey,
    } = this._getKeys(field, { cachePath, queryPath }, index);

    const { cacheability, cachedData } = await this._checkCacheEntry(hashKey);
    this._setCacheEntryData(metadata, cachedData, cacheability, { propKey, queryKey });
    if (!isObjectLike(cachedData)) return;
    const { cache, checkList, counter, queried } = metadata;
    const promises = [];

    this._iterateChildFields(field, cachedData, (childField, childIndex) => {
      promises.push(this._parseField(
        childField,
        { cache, checkList, counter, queried: queried[propKey] },
        cachedData,
        cacheKey,
        queryKey,
        childIndex,
      ));
    });

    await Promise.all(promises);
  }

  /**
   *
   * @private
   * @param {Document} field
   * @param {Object} data
   * @param {Map} cacheMetadata
   * @param {string} [dataPath]
   * @param {string} [queryPath]
   * @param {number} [index]
   * @return {void}
   */
  _parseResponseMetadata(field, data, cacheMetadata, dataPath, queryPath, index) {
    const { dataKey, queryKey } = this._getKeys(field, { dataPath, queryPath }, index);
    const fieldData = get(data, dataKey, null);
    if (!isObjectLike(fieldData)) return;

    if (Object.prototype.hasOwnProperty.call(fieldData, '_metadata')) {
      if (get(fieldData._metadata, ['cacheControl'])) {
        const cacheability = new Cacheability();
        cacheability.parseCacheControl(fieldData._metadata.cacheControl);
        this._setCacheData(cacheMetadata, cacheability, { queryKey });
      }

      delete fieldData._metadata;
    }

    this._iterateChildFields(field, fieldData, (childField, childIndex) => {
      this._parseResponseMetadata(childField, data, cacheMetadata, dataKey, queryKey, childIndex);
    });
  }

  /**
   *
   * @private
   * @param {Document} field
   * @param {Object} metadata
   * @param {any} cachedData
   * @param {string} cachePath
   * @param {string} queryPath
   * @param {number} [index]
   * @return {Promise}
   */
  async _parseSingleField(field, metadata, cachedData, cachePath, queryPath, index) {
    const { name, propKey, queryKey } = this._getKeys(field, { cachePath, queryPath }, index);
    const _cachedData = cachedData[name];
    const { checkList, counter, queried } = metadata;
    this._setCheckList(checkList, _cachedData, { queryKey });
    this._setCounter(counter, _cachedData);
    this._setQueriedData(queried, _cachedData, { propKey });
  }

  /**
   *
   * @private
   * @param {Object} metadata
   * @param {any} cachedData
   * @param {Object} cacheability
   * @param {Object} keys
   * @param {string} keys.propKey
   * @param {string} keys.queryKey
   * @return {void}
   */
  _setCacheEntryData(metadata, cachedData, cacheability, { propKey, queryKey }) {
    const { cache, checkList, counter, queried } = metadata;
    this._setCacheData(cache, cacheability, { queryKey });
    this._setCheckList(checkList, cachedData, { queryKey });
    this._setCounter(counter, cachedData);
    this._setQueriedData(queried, cachedData, { propKey });
  }

  /**
   *
   * @private
   * @param {Map} cacheMetadata
   * @param {Object} cacheability
   * @param {Object} keys
   * @param {string} keys.queryKey
   * @return {void}
   */
  _setCacheData(cacheMetadata, cacheability, { queryKey }) {
    if (cacheMetadata.has(queryKey) || !this.cacheValid(cacheability)) return;
    cacheMetadata.set(queryKey, cacheability);
    const queryCacheability = cacheMetadata.get('query');

    if (!queryCacheability || queryCacheability.metadata.ttl > cacheability.metadata.ttl) {
      cacheMetadata.set('query', cacheability);
    }
  }

  /**
   *
   * @private
   * @param {Map} checkList
   * @param {any} cachedData
   * @param {Object} keys
   * @param {string} keys.queryKey
   * @return {void}
   */
  _setCheckList(checkList, cachedData, { queryKey }) {
    if (checkList.has(queryKey)) return;
    checkList.set(queryKey, cachedData !== undefined);
  }

  /**
   *
   * @private
   * @param {Object} counter
   * @param {any} cachedData
   * @return {void}
   */
  _setCounter(counter, cachedData) {
    counter.total += 1;
    if (cachedData === undefined) counter.missing += 1;
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
  async _setObject(field, data, cacheMetadata, cacheControl, paths, index) {
    const { cacheKey, dataKey, hashKey, queryKey } = this._getKeys(field, paths, index);
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
  _setObjectHashKey(data, dataPath, cachePath, field, index) {
    if (!unwrapInlineFragments(getChildFields(field)).length) return;
    const { hashKey, propKey } = this._getKeys(field, { cachePath, dataPath }, index);
    data[propKey] = { _HashKey: hashKey };
  }

  /**
   *
   * @private
   * @param {Object} queriedData
   * @param {any} cachedData
   * @param {Object} keys
   * @param {string} keys.propKey
   * @return {void}
   */
  _setQueriedData(queriedData, cachedData, { propKey }) {
    if (!isObjectLike(cachedData) && cachedData !== undefined) {
      queriedData[propKey] = cachedData;
    } else if (isObjectLike(cachedData)) {
      queriedData[propKey] = isArray(cachedData) ? [] : {};
    }
  }

  /**
   *
   * @private
   * @param {Document} ast
   * @param {Object} data
   * @param {Map} cacheMetadata
   * @param {Map} [partialCacheMetadata]
   * @return {Map}
   */
  _updateCacheMetadata(ast, data, cacheMetadata, partialCacheMetadata) {
    let _cacheMetadata = new Map([...cacheMetadata]);

    if (partialCacheMetadata) {
      const cacheCacheability = cacheMetadata.get('query');
      const partialCacheability = partialCacheMetadata.get('query');

      if (cacheCacheability && cacheCacheability.metadata.ttl < partialCacheability.metadata.ttl) {
        _cacheMetadata = new Map([...partialCacheMetadata, ...cacheMetadata]);
      } else {
        _cacheMetadata = new Map([...cacheMetadata, ...partialCacheMetadata]);
      }
    }

    getRootFields(ast, (field) => {
      this._parseResponseMetadata(field, data, _cacheMetadata);
    });

    if (!_cacheMetadata.has('query')) {
      const cacheability = new Cacheability();
      cacheability.parseCacheControl(this._defaultCacheControls.query);
      _cacheMetadata.set('query', cacheability);
    }

    return _cacheMetadata;
  }

  /**
   *
   * @private
   * @param {Document} ast
   * @param {Object} data
   * @param {Map} cacheMetadata
   * @return {Promise}
   */
  async _updateObjectCache(ast, data, cacheMetadata) {
    const queryCache = cacheMetadata.get('query');

    getRootFields(ast, (field) => {
      this._setObject(field, data, cacheMetadata, queryCache.printCacheControl());
    });
  }

  /**
   *
   * @private
   * @param {Document} ast
   * @return {Promise}
   */
  async _updateQuery(ast) {
    const _this = this;
    const typeInfo = new TypeInfo(this._schema);

    return visit(ast, {
      enter(node) {
        typeInfo.enter(node);
        if (getKind(node) !== 'Field') return;
        const type = getType(typeInfo.getFieldDef());
        const types = type instanceof GraphQLUnionType ? type.getTypes() : [type];

        types.forEach((_type) => {
          if (!_type.getFields) return;
          const fields = _type.getFields();
          const name = getName(node);

          if (fields[_this._resourceKey] && !hasChildField(node, _this._resourceKey)) {
            const mockAST = parse(`{ ${name} {${_this._resourceKey}} }`);
            const fieldAST = getChildField(getRootField(mockAST, name), _this._resourceKey);
            addChildField(node, fieldAST);
          }

          if (fields._metadata && !hasChildField(node, '_metadata')) {
            const mockAST = parse(`{ ${name} { _metadata { cacheControl } } }`);
            const fieldAST = getChildField(getRootField(mockAST, name), '_metadata');
            addChildField(node, fieldAST);
          }
        });
      },
      leave(node) {
        typeInfo.leave(node);
      },
    });
  }

  /**
   *
   * @param {string} hash
   * @param {Document} ast
   * @return {Promise}
   */
  async analyze(hash, ast) {
    const updatedAST = await this._updateQuery(ast);
    const { cache, checkList, counter, queried } = await this._checkObjectCache(updatedAST);
    if (counter.missing === counter.total) return { updatedAST, updatedQuery: print(updatedAST) };
    if (!counter.missing) return { cachedData: queried, cacheMetadata: cache };
    this._partials.set(hash, { cacheMetadata: cache, cachedData: queried });
    await this._filterQuery(updatedAST, checkList);
    return { filtered: true, updatedAST, updatedQuery: print(updatedAST) };
  }

  /**
   *
   * @param {Object} cacheability
   * @return {boolean}
   */
  cacheValid(cacheability) {
    const noCache = get(cacheability, ['metadata', 'cacheControl', 'noCache'], false);
    return cacheability && !noCache && cacheability.checkTTL();
  }

  /**
   *
   * @param {string} value
   * @return {string}
   */
  hash(value) {
    return md5(value.replace(/\s/g, ''));
  }

  /**
   *
   * @param {string} query
   * @param {Document} ast
   * @param {string} hash
   * @param {Object} data
   * @param {Object} cacheMetadata
   * @param {Object} opts
   * @return {Promise}
   */
  async resolve(query, ast, hash, data, cacheMetadata, opts) {
    if (opts.filtered) {
      const filteredHash = this.hash(query);
      const _cacheMetadata = this._updateCacheMetadata(ast, data, cacheMetadata);

      this._res.set(filteredHash, { cacheMetadata: mapToObject(_cacheMetadata), data }, {
        cacheHeaders: { cacheControl: _cacheMetadata.get('query').printCacheControl() },
      });
    }

    const partial = this._getPartial(hash);
    let _data = data;

    if (partial.cachedData) {
      _data = mergeObjects(partial.cachedData, data, (key, val) => {
        if (isPlainObject(val) && val.id) return val.id;
        return false;
      });
    }

    const _cacheMetadata = this._updateCacheMetadata(
      ast, data, cacheMetadata, partial.cacheMetadata,
    );

    this._res.set(hash, { cacheMetadata: mapToObject(_cacheMetadata), data: _data }, {
      cacheHeaders: { cacheControl: _cacheMetadata.get('query').printCacheControl() },
    });

    this._updateObjectCache(ast, _data, _cacheMetadata);
    return { cacheMetadata: _cacheMetadata, data: _data };
  }
}
