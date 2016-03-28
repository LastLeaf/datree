var View = require('./view');

/*
    def = {
        source: SOURCE_ITEM
        cache: ALLOWED_TO_READ_OR_NOT
        select/add: {
            'FIELD1': 'FIELD_IN_SOURCE'
            'FIELD2': {
                source: OVERRIDED_SOURCE_ITEM
                link: 'FIELD_IN_SOURCE'
                cache: ALLOWED_TO_READ_OR_NOT
                writable: ALLOW_TO_SET_OR_NOT
                set: () => UPDATER
                get: () => FETCHER
                type: Number || String || Boolean || List || Item || Ref || Mixed
                default: DEFAULT_VALUE
            }
            'FUNC1': 'FUNC_IN_SOURCE'
            'FUNC2': () => METHOD
            'FUNC3': {
                source: OVERRIDED_SOURCE_ITEM
                link: 'FUNC_IN_SOURCE'
                method: () => METHOD
            }
        }
        remove: ['FIELD_TO_REMOVE']
        where: {
            WHERE_OPERATORS: ...
        }
        orderBy: DEFAULT_ORDER_BY
        filters: {
            find: () => SELECT_FUNC
            insert: () => SELECT_FUNC
            remove: () => SELECT_FUNC
            update: () => SELECT_FUNC
        }
        methods: {
            'FUNC4': () => METHOD
        }
    }
*/
var createList = function(def){
    return Object.create(listProto);
};

var listProto = Object.create(View.create());

var List = {
    create: function(def){
        // TODO
        return createList(def);
    },
};

listProto.transform = function(def){
    // TODO
    return createList(def);
};

listProto.getItem = function(where){
    // TODO
};

listProto.createItem = function(data){
    // TODO
};

listProto.insert = function(item){
    // TODO
};

listProto.remove = function(where){
    // TODO
};

listProto.update = function(fields, where){
    // TODO
};

listProto.operation = function(operation){
    // TODO
};

listProto.transaction = function(operations){
    // TODO
};

module.exports = List;
