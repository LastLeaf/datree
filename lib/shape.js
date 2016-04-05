var Node = require('./node');
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
        // only for dynamic nodes
        dynamic: ALLOW_DYNAMIC_FIELDS_OR_NOT
        updateFields: () => FETCHER
    }
*/

var matchValueWithType = function(value, type){
    if(type === 'string') return typeof(value) === 'string';
    if(type === 'number') return typeof(value) === 'number';
    if(type === 'boolean') return typeof(value) === 'boolean';
    if(type === 'json') return true;
    if(type === 'function') return typeof(value) === 'function' || (value instanceof FuncArr);
    return false;
};

var getTypeByValue = function(value){
    var type = typeof(value);
    if(type === 'string' || type === 'number' || type === 'boolean' || type === 'function') return type;
    if(value instanceof Array && typeof(value[0]) === 'function') return 'function';
    return 'json';
};

var transformLink = function(shape, source){
    var sourceShape = Node.prototype.getShape.call(source);
    shape.link = source;
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
            var childSource = Node.prototype.getDescendant.call(source, k);
            childShape.cache = shape.cache;
            childShape.writable = (sourceShape.writable && shape.writable);
            transformLink(childShape, childSource);
            shape.fields[k] = Object.freeze(childShape);
        }
        Object.freeze(shape.fields);
    }
    return shape;
};

var normalizeFields = function(def, source, shape){
    var sourceShape = (source && Node.prototype.getShape.call(source)) || null;

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
    } else if(sourceShape) {
        for(k in sourceShape) {
            if(def.addFields && def.addFields[k]) continue;
            if(removeFields.indexOf(k) >= 0) continue;
            fields[k] = k;
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
    if(typeof(def) === 'function') {
        def = { value: def };
    } else if(def instanceof Node) {
        def = { link: def };
    } else if(typeof(def) !== 'object') {
        def = { link: String(def) };
    }

    // basic config
    var source = null;
    if((typeof(def.link || def.source) === 'string')) {
        if(parentSource) source = Node.prototype.getDescendant(parentSource, def.link || def.source);
        else throw new NodeError('Relative path is not supported without Node given in ancestors.');
    } else if(def.link || def.source) {
        source = def.source || null;
    }
    if(source && !(source instanceof Node)) throw new NodeError('Source could only be another node.');
    var cache = parentShape ? !!parentShape.cache : true;
    cache = (def.cache !== undefined) ? !!def.cache : cache;
    var writable = parentShape ? !!parentShape.writable : true;
    writable = (def.writable !== undefined) ? !!def.writable && writable : writable;

    // create shape
    var shape = Object.create(Shape.prototype);
    shape.parent = parentShape || null;
    shape.parentPath = parentPath || '';
    shape.source = source;
    shape.cache = cache;
    shape.writable = writable;

    // infer link
    if(def.link) {
        if(!(source instanceof Node)) throw new NodeError('The source could only be another node.');
        transformLink(shape, source);
        if(def.type !== undefined && shape.type !== def.type) {
            throw new NodeError('Defined type "' + def.type + '" does not match linked type "' + shape.type + '".');
        }
        if(def.value !== undefined && shape.value !== def.value) {
            throw new NodeError('Defined initial value does not match linked initial value.');
        }
        if(def.fields !== undefined || def.addFields !== undefined || def.removeFields !== undefined) {
            throw new NodeError('Fields are not allowed to be defined in linked nodes.');
        }
    } else if(def.type || def.value !== undefined) {
        // infer type and value
        if(def.fields !== undefined || def.addFields !== undefined || def.removeFields !== undefined) {
            throw new NodeError('Fields are not allowed to be defined in leaf nodes.');
        }
        if(def.dynamic !== undefined) {
            throw new NodeError('"dynamic" option is not allowed to be defined in leaf nodes.');
        }
        if(def.type) {
            if(def.value === undefined) {
                if(def.type === 'string') shape.value = '';
                else if(def.type === 'number') shape.value = 0;
                else if(def.type === 'boolean') shape.value = false;
                else if(def.type === 'json') shape.value = 'null';
                else if(def.type === 'function') shape.value = null;
                else throw new NodeError('Field type "' + def.type + '" is illegal.');
            } else {
                if(!matchValueWithType(def.value, def.type)) {
                    throw new NodeError('Default value [' + def.value + '] does not match type "' + def.type + '".');
                }
                if(def.type === 'json') {
                    shape.value = JSON.stringify(def.value);
                } else if(def.type === 'function') {
                    shape.value = FuncArr.create(def.value);
                } else {
                    shape.value = def.value;
                }
            }
            shape.type = def.type;
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

    // filters
    shape.request = FuncArr.create(def.request);
    shape.update = FuncArr.create(def.update);
    if(shape.dynamic) {
        shape.updateFields = FuncArr.create(def.updateFields);
    } else if(shape.updateFields !== undefined) {
        throw new NodeError('"updateFields" option is not allowed to be defined in non-dynamic nodes.');
    }

    return Object.freeze(shape);
};

Shape.create = function(def){
    return Shape._create(def);
};

module.exports = Shape;
