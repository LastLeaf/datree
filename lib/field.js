var List = require('./list');
var Item = require('./item');
var ViewError = require('./view_error');

var Field = function Field(){};
Field.prototype = Object.create(Object.prototype, {
    constructor: {
        value: Field,
        writable: true,
        configurable: true
    }
});

Field.getTypeByValue = function(value){
    if(value instanceof List) return 'list';
    if(value instanceof Item) return 'item';
    var type = typeof(value);
    if(type === 'string' || type === 'number' || type === 'boolean') return type;
    return 'mixed';
};

Field.normalizeField = function(viewType, def, defVal){
    // detect it is a child view or not
    if(def.view) {
        return Field.normalizeFields(def, defVal);
    }

    // construct field options
    var field = null;
    if(typeof(def) === 'string') {
        field = {
            source: defVal.source || null,
            link: def,
            cache: !!defVal.cache || false,
            set: null,
            get: null,
            value: undefined,
            type: '',
            writable: true,
        }
    } else {
        field = {
            source: def.source || defVal.source || null,
            link: String(def.link) || '',
            cache: !!def.cache || !!defVal.cache || false,
            set: def.set || null,
            get: def.get || null,
            value: def.value || undefined,
            type: String(def.type) || '',
            writable: !!def.writable || true,
        };
    }

    // basic validation
    if(field.source && field.source.viewType !== viewType) {
        throw new ViewError('The source view type does not match the destination view type.');
    }

    // type and value
    if(field.type) {
        if(field.type !== 'mixed' && Field.getTypeByValue(field.value) !== field.type) {
            throw new ViewError('Default value [' + field.value + '] does not match type "' + field.type + '".');
        }
        if(field.value === undefined) {
            if(field.type === 'string') field = '';
            else if(field.type === 'number') field = 0;
            else if(field.type === 'boolean') field = false;
            else if(field.type !== 'list' && field.type !== 'item' && field.type !== 'mixed') {
                throw new ViewError('Field type "' + field.type + '" is illegal.');
            }
        }
    } else if(field.value !== undefined) {
        field.type = Field.getTypeByValue(field.value);
    } else if(!field.link) {
        field.type = 'mixed';
    }

    // check link
    if(field.link) {
        if(!field.source) {
            throw new ViewError('Source is not defined for link "' + def.link + '"');
        }
        // TODO
    }

    return field;
};

Field.normalizeFields = function(def, defVal){
    var viewType = def.view;
    var source = def.source || defVal.source || null;
    var cache = !!def.cache || !!defVal.cache || false;

    if(def.view !== 'list' && def.view !== 'item') throw new ViewError('View type "' + def.view +'" is illegal.');

    var k = '';
    var keyRe = /^[a-z_]+$/i;
    var fields = {};

    if(def.select) {
        for(k in def.select) {
            if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
            fields[k] = Field.normalizeField(viewType, def.select[k], {
                source: source,
                cache: cache,
            });
        }
    } else {
        if(source) {
            for(k in source) {
                if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
                if(def.add && def.add[k]) continue;
                if(def.remove && def.remove.indexOf(k) >= 0) continue;
                fields[k] = Field.normalizeField(viewType, k, {
                    source: source,
                    cache: cache,
                });
            }
        }
        if(def.add) {
            for(k in def.add) {
                if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
                fields[k] = Field.normalizeField(viewType, def.add[k], {
                    source: source,
                    cache: cache,
                });
            }
        }
    }

    return fields;
};
