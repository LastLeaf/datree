var Node = require('./node');
var NodeError = require('./node_error');
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
        source: SOURCE
        cache: DEFAULT_CACHE_OR_NOT
        fields/addFields: {
            'FIELD1': 'FIELD_IN_SOURCE'
            'FIELD2': {
                source: SOURCE_OR_PATH
                link: SOURCE_OR_PATH
                cache: CACHE_OR_NOT
                writable: WRITABLE_OR_NOT
                update: () => UPDATER
                sync: () => FETCHER
                watch: () => FETCHER
                // only for leaf nodes
                type: 'string' || 'number' || 'boolean' || 'node' || 'object' || 'function'
                value: DEFAULT_VALUE
            }
        }
        removeFields: ['FIELD_TO_REMOVE']
        dynamicFields: ALLOW_DYNAMIC_FIELDS_OR_NOT
        update: () => FUNC
        sync: () => FUNC
        watch: () => FETCHER
    }
*/

var matchValueWithType = function(value, type){
    if(type === 'string') return typeof(value) === 'string';
    if(type === 'number') return typeof(value) === 'number';
    if(type === 'boolean') return typeof(value) === 'boolean';
    if(type === 'node') return value instanceof Node;
    if(type === 'object') return true;
    if(type === 'function') return value instanceof FuncArr;
    return false;
};

var getTypeByValue = function(value){
    if(value instanceof Node) return 'node';
    var type = typeof(value);
    if(type === 'string' || type === 'number' || type === 'boolean' || type === 'function') return type;
    if(value instanceof Array && typeof(value[0]) === 'function') return 'function';
    return 'object';
};

var transformLink = function(shape, source){
    var sourceShape = Node.prototype.getShape.call(source);
    if(sourceShape.type) {
        shape.type = sourceShape.type;
        shape.value = sourceShape.value;
        shape.writable = sourceShape.writable;
    } else {
        shape.fields = {};
        for(var k in sourceShape.fields) {
            var childShape = Object.create(Shape.prototype);
            childShape.parent = shape;
            childShape.source = Node.prototype.getChild.call(source, k);
            childShape.cache = shape.cache;
            transformLink(childShape, sourceShape.fields[k]);
            shape.fields[k] = Object.freeze(childShape);
        }
    }
    return shape;
};

var normalizeFields = function(def, shape){
    var source = shape.source || null;
    var sourceShape = (source && Node.prototype.getShape.call(source)) || null;

    var k = '';
    var keyRe = /^([_a-z][_a-z0-9])$/i;
    var fields = {};
    shape.fields = fields;
    if(def.dynamicFields && !sourceShape.dynamicFields) {
        throw new NodeError('Defined dynamicFields option does not match linked dynamicFields option.');
    }
    shape.dynamicFields = !!def.dynamicFields;

    if(typeof(def.fields) === 'object') {
        for(k in def.fields) {
            if(!keyRe.test(k)) throw new NodeError('Field name "' + k + '" is illegal.');
            if(def.removeFields instanceof Array && def.removeFields.indexOf(k) >= 0) continue;
            fields[k] = def.fields[k];
        }
    } else if(sourceShape) {
        for(k in sourceShape) {
            if(!keyRe.test(k)) throw new NodeError('Field name "' + k + '" is illegal.');
            if(def.addFields && def.addFields[k]) continue;
            if(def.removeFields instanceof Array && def.removeFields.indexOf(k) >= 0) continue;
            fields[k] = k;
        }
    }
    if(typeof(def.addFields) === 'object') {
        for(k in def.addFields) {
            if(!keyRe.test(k)) throw new NodeError('Field name "' + k + '" is illegal.');
            fields[k] = def.addFields[k];
        }
    }

    for(k in fields) {
        fields[k] = Shape.create(fields[k], shape);
    }

    Object.freeze(fields);
};

Shape.create = function(def, parentShape){
    // basic config
    var source = null;
    if((typeof(def.link || def.source) === 'string') && parentShape) {
        source = Node.prototype.getChild(parentShape.source, def.link || def.source);
    } else if(def.link || def.source) {
        source = def.source || null;
    }
    if(source && !(source instanceof Node)) throw new NodeError('Source could only be another node.');
    var cache = def.cache || (parentShape && parentShape.cache) || true;

    // create shape
    var shape = Object.create(Shape.prototype);
    shape.parent = parentShape || null;
    shape.source = source;
    shape.cache = cache;

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
        if(def.writable !== undefined && !shape.writable && def.writable) {
            throw new NodeError('Defined writable option does not match linked writable option.');
        }
        if(def.fields !== undefined || def.addFields !== undefined || def.removeFields !== undefined) {
            throw new NodeError('Fields are not allowed to be defined in linked nodes.');
        }
    } else {
        // infer type and value
        if(def.type) {
            if(def.value === undefined) {
                if(def.type === 'string') shape.value = '';
                else if(def.type === 'number') shape.value = 0;
                else if(def.type === 'boolean') shape.value = false;
                else if(def.type === 'node') shape.value = null;
                else if(def.type === 'object') shape.value = 'null';
                else if(def.type === 'function') shape.value = null;
                else throw new NodeError('Field type "' + def.type + '" is illegal.');
            } else {
                if(!matchValueWithType(def.value, def.type)) {
                    throw new NodeError('Default value [' + def.value + '] does not match type "' + def.type + '".');
                }
                if(def.type === 'object') {
                    shape.value = JSON.stringify(def.value);
                } else if(def.type === 'function') {
                    shape.value = FuncArr.create(def.value);
                } else {
                    shape.value = def.value;
                }
            }
            shape.type = def.type;
        } else if(def.value !== undefined) {
            shape.type = getTypeByValue(def.value);
            if(shape.type === 'object') {
                shape.value = JSON.stringify(def.value);
            } else if(shape.type === 'function') {
                shape.value = FuncArr.create(def.value);
            } else {
                shape.value = def.value;
            }
        } else {
            normalizeFields(def, shape);
        }
        shape.writable = true;
    }
    if(!def.writable || !parentShape.writable) shape.writable = false;

    return Object.freeze(shape);
};

module.exports = Shape;
