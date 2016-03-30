var View = require('./view');
var ViewError = require('./view_error');
var List = require('./list');

var Item = function DbviewItem(){};
Item.prototype = Object.create(View.prototype, {
    constructor: {
        value: Item,
        writable: true,
        configurable: true
    }
});

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
            set: () => FUNC
        }
        mixin: []
    }
*/
var createItem = function(def, parent){
    var select = def.select || {};
    var props = {};


    return Object.create(Item.prototype);
};

Item.prototype.transform = function(def){
    // TODO
    return createItem(def);
};

Item.prototype.set = function(fields){
    // TODO
};

module.exports = Item;
