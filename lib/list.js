var View = require('./view');
var ViewError = require('./view_error');
var Item = require('./item');
var Field = require('./field');

var List = function DbviewList(){};
List.prototype = Object.create(View.prototype, {
    constructor: {
        value: List,
        writable: true,
        configurable: true
    }
});

/*
    def = {
        view: 'list'
        mixins: []
        source: SOURCE_LIST
        cache: CACHE_OR_NOT
        select/add: {
            'FIELD1': 'FIELD_IN_SOURCE'
            'FIELD2': {
                source: OVERRIDED_SOURCE_ITEM
                link: 'FIELD_IN_SOURCE'
                cache: CACHE_OR_NOT
                writable: ALLOW_TO_SET_OR_NOT
                set: () => UPDATER
                get: () => FETCHER
                type: Number || String || Boolean || List || Item || Mixed
                value: DEFAULT_VALUE
            }
        }
        remove: ['FIELD_TO_REMOVE']
        orderBy: ORDER_BY
        skip: SKIP
        limit: LIMIT
        having: {
            HAVING_FIELD: CONST_OR_LINK
        }
        where: {
            WHERE_OPERATORS: ...
        }
        filters: {
            get: () => FUNC
            insert: () => FUNC
            remove: () => FUNC
            update: () => FUNC
        }
    }
*/
List._prepareSchema = function(def, parentSchema){
    // basic config
    var source = def.source || (parentSchema && parentSchema.source) || null;
    var cache = def.cache || (parentSchema && parentSchema.cache) || false;
    var mixins = def.mixins || [];
    var filters = def.filters || {};
    filters = {
        get: filters.get,
        insert: filters.insert,
        remove: filters.remove,
        update: filters.update,
    };

    // create schema
    var schema = {
        viewType: 'list',
        parent: parentSchema,
        source: source,
        cache: cache,
        mixins: mixins,
        filters: filters,
        fields: {},
        orderBy: orderBy,
        skip: skip,
        limit: limit,
    };

    // normalize fields
    Field.normalizeSelects({
        view: 'list',
        select: def.select,
        add: def.add,
        remove: def.remove,
    }, schema);

    // TODO parse having
    // TODO parse where

    // parse special states
    var orderBy = def.orderBy || '';
    var skip = def.skip || -1;
    var limit = def.limit || -1;
    if(typeof(orderBy) === 'object') {
        orderBy = Field.inferLink(orderBy);
        if(orderBy.type !== 'string') throw new ViewError('The "orderBy" field can only link to a string field.');
    }
    if(typeof(skip) === 'object') {
        skip = Field.inferLink(skip);
        if(skip.type !== 'number') throw new ViewError('The "skip" field can only link to a number field.');
    }
    if(typeof(limit) === 'object') {
        limit = Field.inferLink(limit);
        if(limit.type !== 'string') throw new ViewError('The "limit" field can only link to a number field.');
    }

    return schema;
};

List._createFromSchema = function(schema, parent){

};

List.create = function(def){
    var schema = List._prepareSchema(def, null);
    return List._createFromSchema(schema, null);
};

List.prototype.transform = function(def){
    // TODO
    return List.create(def);
};

List.prototype.sync = function(fields){
    // TODO
};

List.prototype.destroy = function(fields){
    // TODO
};

List.prototype.getItem = function(where){
    // TODO
};

List.prototype.createItem = function(data){
    // TODO
};

List.prototype.insert = function(item){
    // TODO
};

List.prototype.remove = function(where){
    // TODO
};

List.prototype.update = function(fields, where){
    // TODO
};

List.prototype.operation = function(operation){
    // TODO
};

List.prototype.transaction = function(operations){
    // TODO
};

module.exports = List;
