var NodeError = require('./node_error');
var FuncArr = require('./func_arr');

var Shape = function Shape(){};
Shape.prototype = Object.create(Object.prototype, {
    constructor: {
        value: Shape,
        writable: true,
        configurable: true
    }
});

/*
    def = {
        source: SOURCE
        cache: DEFAULT_CACHE_OR_NOT
        fields/addFields: {
            'FIELD1': 'FIELD_IN_SOURCE'
            'FIELD2': {
                source: SOURCE_OR_PATH
                link: SOURCE_OR_PATH
                request: () => UPDATER
                update: () => FETCHER
                // inherit
                cache: CACHE_OR_NOT
                writable: WRITABLE_OR_NOT
                // only for leaf nodes
                type: 'string' || 'number' || 'boolean' || 'json' || 'function'
                value: DEFAULT_VALUE
            }
        }
        removeFields: ['FIELD_TO_REMOVE']
        request: () => UPDATER
        update: () => FETCHER
        updateFields: () => FETCHER
        // only for dynamic nodes
        dynamic: ALLOW_DYNAMIC_FIELDS_OR_NOT
    }
*/

var PRESERVED_CONFIG_KEYS = [
    'source',
    'cache',
    'link',
    'create',
    'destroy',
    'request',
    'update',
    'updateFields',
    'writable',
    'type',
    'value',
    'dynamic',
    'fields',
    'addFields',
    'removeFields',
];

var matchValueWithType = function(value, type){
    if(type === 'string') return typeof(value) === 'string';
    if(type === 'number') return typeof(value) === 'number';
    if(type === 'boolean') return typeof(value) === 'boolean';
    if(type === 'json') return value !== undefined;
    if(type === 'function') return typeof(value) === 'function' || (value instanceof FuncArr) || (value instanceof Array);
    return false;
};

var getTypeByValue = function(value){
    var type = typeof(value);
    if(type === 'string' || type === 'number' || type === 'boolean' || type === 'function') return type;
    if(value instanceof FuncArr || (value instanceof Array && typeof(value[0]) === 'function')) return 'function';
    return 'json';
};

var transformLink = function(shape, source){
    var sourceShape = source.$shape;
    shape.link = source;
    if(!sourceShape.writable) shape.writable = false;
    if(sourceShape.type) {
        shape.type = sourceShape.type;
        shape.value = sourceShape.value;
    } else {
        shape.fields = {};
        shape.dynamic = sourceShape.dynamic;
        for(var k in sourceShape.fields) {
            var childShape = Object.create(Shape.prototype);
            childShape.parent = shape;
            childShape.parentPath = k;
            var childSource = Object.getPrototypeOf(source).$getDescendant.call(source, k);
            childShape.cache = shape.cache;
            childShape.writable = shape.writable;
            transformLink(childShape, childSource);
            childShape.create = FuncArr.create();
            childShape.destroy = FuncArr.create();
            childShape.request = FuncArr.create();
            childShape.update = FuncArr.create();
            if(!childShape.type) {
                childShape.updateFields = FuncArr.create();
            }
            shape.fields[k] = Object.freeze(childShape);
        }
        Object.freeze(shape.fields);
    }
    return shape;
};

var normalizeFields = function(def, source, shape){
    var sourceShape = (source && source.$shape) || null;

    var k = '';
    var fields = {};
    shape.fields = fields;

    var removeFields = def.removeFields;
    if(!(def.removeFields instanceof Array)) {
        removeFields = [];
        if(typeof(def.removeFields) === 'object') {
            for(k in def.removeFields) {
                if(def.removeFields[k]) removeFields.push(k);
            }
        }
    }

    if(typeof(def.fields) === 'object') {
        for(k in def.fields) {
            if(removeFields.indexOf(k) >= 0) continue;
            fields[k] = def.fields[k];
        }
    } else {
        var hiddenFields = [];
        for(k in def) {
            if(PRESERVED_CONFIG_KEYS.indexOf(k) >= 0) continue;
            hiddenFields.push(k);
        }
        if(hiddenFields.length) {
            for(var i=0; i < hiddenFields.length; i++) {
                k = hiddenFields[i];
                if(removeFields.indexOf(k) >= 0) continue;
                fields[k] = def[k];
            }
        } else if(sourceShape && sourceShape.fields) {
            for(k in sourceShape.fields) {
                if(removeFields.indexOf(k) >= 0) continue;
                fields[k] = source.$statics[k];
            }
        }
    }
    if(typeof(def.addFields) === 'object') {
        for(k in def.addFields) {
            fields[k] = def.addFields[k];
        }
    }

    for(k in fields) {
        fields[k] = Shape._create(fields[k], source, shape, k);
    }

    Object.freeze(fields);
};

Shape._create = function(def, parentSource, parentShape, parentPath){
    // short def form
    if(def === Number || def === String || def === Boolean || def === JSON ) {
        def = { type: def };
    } else if(typeof(def) === 'function') {
        def = { value: def };
    } else if(def && (def.$shape instanceof Shape || def instanceof Array)) {
        def = { link: def };
    } else if(typeof(def) !== 'object') {
        def = { link: String(def) };
    } else if(!def){
        throw new NodeError('Defination is not given.');
    }

    // basic config
    var source = parentSource || null;
    if((typeof(def.link || def.source) === 'string' || def.link instanceof Array)) {
        if(parentSource) source = Object.getPrototypeOf(parentSource).$getDescendant.call(parentSource, def.link || def.source);
        else throw new NodeError('Relative path is not supported without Node given in ancestors.');
    } else if(def.link || def.source) {
        source = def.link || def.source;
    }
    if(source && !(source.$shape instanceof Shape)) throw new NodeError('The source could only be another node.');
    var cache = parentShape ? !!parentShape.cache : true;
    cache = (def.cache !== undefined) ? !!def.cache : cache;
    var writable = parentShape ? !!parentShape.writable : true;
    writable = (def.writable !== undefined) ? !!def.writable && writable : writable;

    // create shape
    var shape = Object.create(Shape.prototype);
    shape.parent = parentShape || null;
    shape.parentPath = parentPath || '';
    shape.cache = cache;
    shape.writable = writable;

    // type alias
    var defType = def.type;
    if(defType === Number) {
        defType = 'number';
    } else if(defType === String) {
        defType = 'string';
    } else if(defType === Boolean) {
        defType = 'boolean';
    } else if(defType === JSON) {
        defType = 'json';
    }

    // infer link
    if(def.link) {
        transformLink(shape, source);
        if(def.type !== undefined && shape.type !== defType) {
            throw new NodeError('Defined type "' + defType + '" does not match linked type "' + shape.type + '".');
        }
        if(def.value !== undefined && shape.value !== def.value) {
            throw new NodeError('Defined initial value does not match linked initial value.');
        }
        if(def.dynamic !== undefined && shape.dynamic !== def.dynamic) {
            throw new NodeError('Defined "dynamic" option does not match linked option.');
        }
        if(def.fields !== undefined || def.addFields !== undefined || def.removeFields !== undefined) {
            throw new NodeError('Fields are not allowed to be defined in linked nodes.');
        }
    } else if(defType || def.value !== undefined) {
        // infer type and value
        if(def.fields !== undefined || def.addFields !== undefined || def.removeFields !== undefined) {
            throw new NodeError('Fields are not allowed to be defined in leaf nodes.');
        }
        if(def.dynamic !== undefined) {
            throw new NodeError('"dynamic" option is not allowed to be defined in leaf nodes.');
        }
        if(defType) {
            if(def.value === undefined) {
                if(defType === 'string') shape.value = '';
                else if(defType === 'number') shape.value = 0;
                else if(defType === 'boolean') shape.value = false;
                else if(defType === 'json') shape.value = 'null';
                else if(defType === 'function') shape.value = FuncArr.create();
                else throw new NodeError('Field type "' + defType + '" is illegal.');
            } else {
                if(!matchValueWithType(def.value, defType)) {
                    throw new NodeError('Default value [' + def.value + '] does not match type "' + defType + '".');
                }
                if(defType === 'json') {
                    shape.value = JSON.stringify(def.value);
                } else if(defType === 'function') {
                    shape.value = FuncArr.create(def.value);
                } else {
                    shape.value = def.value;
                }
            }
            shape.type = defType;
        } else {
            shape.type = getTypeByValue(def.value);
            if(shape.type === 'json') {
                shape.value = JSON.stringify(def.value);
            } else if(shape.type === 'function') {
                shape.value = FuncArr.create(def.value);
            } else {
                shape.value = def.value;
            }
        }
    } else {
        shape.dynamic = !!def.dynamic;
        normalizeFields(def, source, shape);
    }
    if(shape.type === 'function' && !shape.writable) {
        throw new NodeError('Function-typed nodes should always be writable.');
    }

    // filters
    shape.create = FuncArr.create(def.create);
    shape.destroy = FuncArr.create(def.destroy);
    shape.request = FuncArr.create(def.request);
    if(shape.link || !shape.type) {
        shape.update = FuncArr.create(def.update);
    } else if(def.update !== undefined) {
        throw new NodeError('"update" option is not allowed to be defined in non-link leaf nodes.');
    }
    if(!shape.type) {
        shape.updateFields = FuncArr.create(def.updateFields);
    } else if(def.updateFields !== undefined) {
        throw new NodeError('"updateFields" option is not allowed to be defined in leaf nodes.');
    }

    return Object.freeze(shape);
};

Shape.create = function(def){
    return Shape._create(def);
};

module.exports = Shape;
