var View = require('./view');
var ViewError = require('./view_error');
var FuncArr = require('./func_arr');

var Shape = function(){};
Shape.name = 'Datree.Shape';
Shape.prototype = Object.create(Object.prototype, {
    constructor: {
        value: Shape,
        writable: true,
        configurable: true
    }
});

/*
    def = {
        source: SOURCE_VIEW
        cache: DEFAULT_CACHE_OR_NOT
        select/add: {
            'FIELD1': 'FIELD_IN_SOURCE'
            'FIELD2': {
                link: 'FIELD_IN_SOURCE'
                cache: CACHE_OR_NOT
                writable: MUTABLE_OR_NOT
                update: () => UPDATER
                sync: () => FETCHER
                watch: () => FETCHER
                type: 'string' || 'number' || 'boolean' || 'view' || 'object' || 'function'
                value: DEFAULT_VALUE
            }
        }
        remove: ['FIELD_TO_REMOVE']
        filters: {
            update: () => FUNC
            sync: () => FUNC
        }
        defaultField: {}
    }
*/

var matchValueWithType = function(value, type){
    if(type === 'string') return typeof(value) === 'string';
    if(type === 'number') return typeof(value) === 'number';
    if(type === 'boolean') return typeof(value) === 'boolean';
    if(type === 'view') return value instanceof View;
    if(type === 'object') return true;
    if(type === 'function') return value instanceof FuncArr;
    return false;
};

var getTypeByValue = function(value){
    if(value instanceof View) return 'view';
    var type = typeof(value);
    if(type === 'string' || type === 'number' || type === 'boolean' || type === 'function') return type;
    if(value instanceof Array && typeof(value[0]) === 'function') return 'function';
    return 'object';
};

var inferLink = function(linkObj, selfShape){
    var source = linkObj.source;
    var plevel = linkObj.plevel;
    var link = linkObj.link;

    // find field
    if(source && !(source instanceof View)) throw new ViewError('Source could only be another view.');
    var shape = source && View.prototype.getShape.call(source);
    if(link[0] === '~') {
        link = link.slice(1);
        shape = selfShape;
        source = null;
    }
    if(!shape) throw new ViewError('Source is not found.');
    while(link[0] === '.') {
        shape = shape.parent;
        if(!shape) throw new ViewError('Source parent is not found.');
        link = link.slice(1);
        plevel++;
    }
    var fields = shape.fields[link];
    if(!fields) throw new ViewError('The linked field is not found on the source.');

    return Object.freeze({
        source: source,
        plevel: plevel,
        link: link,
        value: fields.value,
        type: fields.type,
        writable: fields.writable,
    });
};

var normalizeField = function(def, shape){
    // construct field options
    var field = null;
    if(typeof(def) === 'string') {
        field = {
            source: shape.source || null,
            plevel: Number(def.plevel) || 0,
            link: String(def || ''),
            cache: !!shape.cache || false,
            update: FuncArr.create(),
            sync: FuncArr.create(),
            watch: FuncArr.create(),
            value: undefined,
            type: '',
            writable: true,
        }
    } else if(typeof(def) === 'function' || (def instanceof Array && typeof(def[0]) === 'function')) {
        field = {
            source: shape.source || null,
            plevel: Number(def.plevel) || 0,
            link: String(def || ''),
            cache: !!shape.cache || false,
            update: FuncArr.create(),
            sync: FuncArr.create(),
            watch: FuncArr.create(),
            value: FuncArr.create(def),
            type: 'function',
            writable: true,
        }
    } else {
        field = {
            source: def.source || shape.source || null,
            plevel: Number(def.plevel) || 0,
            link: String(def.link || ''),
            cache: !!def.cache || !!shape.cache || false,
            update: FuncArr.create(def.update || null),
            sync: FuncArr.create(def.sync || null),
            watch: FuncArr.create(def.watch || null),
            value: def.value || undefined,
            type: String(def.type || ''),
            writable: !!def.writable || true,
        };
    }

    // type and value
    if(field.type) {
        if(!matchValueWithType(field.value, field.type)) {
            throw new ViewError('Default value [' + field.value + '] does not match type "' + field.type + '".');
        }
        if(field.value === undefined) {
            if(field.type === 'string') field.value = '';
            else if(field.type === 'number') field.value = 0;
            else if(field.type === 'boolean') field.value = false;
            else if(field.type === 'view') field.value = null;
            else if(field.type === 'object') field.value = 'null';
            else if(field.type === 'function') field.value = null;
            else throw new ViewError('Field type "' + field.type + '" is illegal.');
        } else {
            if(field.type === 'object') {
                field.value = JSON.stringify(field.value);
            }
        }
    } else if(field.value !== undefined) {
        field.type = getTypeByValue(field.value);
        if(field.type === 'object') {
            field.value = JSON.stringify(field.value);
        } else if(field.type === 'function') {
            field.value = FuncArr.create(field.value);
        }
    } else if(!field.link) {
        field.type = 'object';
        field.value = 'null';
    }

    // link inference
    if(field.link) {
        var linkObj = inferLink(def.link, shape);
        if(linkObj.type !== field.type) {
            throw new ViewError('Defined type "' + field.type + '" does not match linked type "' + linkObj.type + '".');
        }
        if(linkObj.writable && field.writable) {
            throw new ViewError('Defined writable option does not match linked writable option.');
        }
        if(linkObj.value !== field.value) {
            throw new ViewError('Defined initial value does not match linked initial value.');
        }
        field.source = linkObj.source;
        field.plevel = linkObj.plevel;
        field.link = linkObj.link;
    }

    return Object.freeze(field);
};

var normalizeSelects = function(def, shape){
    var source = shape.source || null;
    var cache = !!shape.cache || false;

    var k = '';
    var keyRe = /^([_a-z][_a-z0-9])$/i;
    var fields = {};
    var deferredFields = {};
    shape.fields = fields;

    if(typeof(def.select) === 'object') {
        for(k in def.select) {
            if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
            if(def.select[k].type === 'subview') {
                deferredFields[k] = def.select[k];
            } else {
                fields[k] = def.select[k];
            }
        }
    } else {
        if(source) {
            for(k in View.prototype.getShape.call(source)) {
                if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
                if(def.add && def.add[k]) continue;
                if(def.remove instanceof Array && def.remove.indexOf(k) >= 0) continue;
                fields[k] = k;
            }
        }
        if(typeof(def.add) === 'object') {
            for(k in def.add) {
                if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
                if(def.add[k].type === 'subview') {
                    deferredFields[k] = def.add[k];
                } else {
                    fields[k] = def.add[k];
                }
            }
        }
    }

    for(k in fields) {
        fields[k] = normalizeField(fields[k], {
            source: source,
            cache: cache,
        });
    }
    for(k in deferredFields) {
        fields[k] = Shape.create(def, shape, k);
    }

    Object.freeze(fields);
};

Shape.create = function(def, parentShape, parentFieldName){
    // basic config
    var source = def.source || (parentShape && parentShape.source && View.prototype.getChild.call(parentShape.source, parentFieldName)) || null;
    if(source && !(source instanceof View)) throw new ViewError('Source could only be another view.');
    var cache = def.cache || (parentShape && parentShape.cache) || false;
    var filters = def.filters || {};
    filters = {
        update: FuncArr.create(filters.update),
        sync: FuncArr.create(filters.sync),
    };
    Object.freeze(filters);

    // create shape
    var shape = Object.create(Shape.prototype);
    shape.parent = parentShape || null;
    shape.source = source;
    shape.cache = cache;
    shape.filters = filters;
    shape.fields = null;

    // normalize fields
    normalizeSelects({
        select: def.select,
        add: def.add,
        remove: def.remove,
    }, shape);

    return Object.freeze(shape);
};

module.exports = Shape;
