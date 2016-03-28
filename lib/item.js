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
        filters: {
            update: () => SELECT_FUNC
        }
    }
*/
var createItem = function(def){
    var select = def.select || {};
    var props = {};

    var createField = function(){
        // TODO
    };
    for(var k in select) {
        var field = createField(select[k]);
        props = field.prop;
    }
    // TODO

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

itemProto.update = function(fields){
    // TODO
};

module.exports = Item;
