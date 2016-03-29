var View = require('./view');
var ViewError = require('./view_error');
var Item = require('./item');
var Field = require('./field');

var List = function List(){};
List.prototype = Object.create(View.prototype, {
    constructor: {
        value: List,
        writable: true,
        configurable: true
    }
});

/*
    def = {
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
                watch: () => WATCHER
                type: Number || String || Boolean || List || Item || View || Mixed
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
            watch: () => FUNC
            insert: () => FUNC
            remove: () => FUNC
            update: () => FUNC
        }
        mixins: []
        methods: {
            'FUNC4': () => METHOD
        }
    }
*/
var createList = function(def, parent){
    // basic config
    var source = def.source || (parent && parent.source) || null;
    var cache = def.cache || (parent && parent.cache) || false;
    var orderBy = def.orderBy || '';
    var skip = def.skip || -1;
    var limit = def.limit || -1;

    // fields
    var fields = Field.normalizeFields(List, def, {
        source: source,
        cache: cache,
    });

    return Object.create(listProto);
};

List.create: function(def){
    // TODO
    return createList(def);
};

List.prototype.transform = function(def){
    // TODO
    return createList(def);
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
