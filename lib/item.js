var View = require('./view');
var ViewError = require('./view_error');
var List = require('./list');

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
                type: Number || String || Boolean || Mixed
                value: DEFAULT_VALUE
            }
        }
        remove: ['FIELD_TO_REMOVE']
        filters: {
            get: () => FUNC
            watch: () => FUNC
            update: () => FUNC
        }
        mixin: []
    }
*/
var createItem = function(def, parent){
    var select = def.select || {};
    var props = {};


    return Object.create(itemProto, props);
};

var itemProto = Object.create(View.create());

var Item = {
    create: function(def){
        // TODO
        return createItem(def);
    },
    combine: function(arr){
        // TODO
        var def = {};
        return createItem(def);
    },
};

itemProto.transform = function(def){
    // TODO
    return createItem(def);
};

itemProto.sync = function(arr){
    // TODO
};

itemProto.update = function(fields){
    // TODO
};

module.exports = Item;
