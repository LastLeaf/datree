var Node = require('./node');

var Field = function(){};
Field.name = 'Datree.Field';
Field.prototype = Object.create(Object.prototype, {
    constructor: {
        value: Field,
        writable: true,
        configurable: true
    }
});

var convertValueToType = function(value, type, defaultValue){
    if(type === 'string') {
        if(typeof(value) === 'number' || typeof(value) === 'boolean' || typeof(value) === 'string') return String(value);
        return defaultValue;
    }
    if(type === 'number') {
        value = Number(value);
        if(Number.isNaN(value)) return defaultValue;
        return value;
    }
    if(type === 'boolean') {
        if(value === undefined) return defaultValue;
        return !!value;
    }
    if(type === 'json') {
        if(value === undefined) return JSON.parse(defaultValue);
        return value;
    }
    if(type === 'ref' && value instanceof Node) return value;
    return null;
};

Field.create = function(node, def){
    var cachedValue = def.value;
    if(def.cache && def.type === 'json') cachedValue = JSON.parse(def.value);
    var field = Object.create(Field.prototype, {
        node: { value: node },
        type: { value: def.type },
        writable: { value: def.writable },
        update: { value: def.update },
        sync: { value: def.sync },
        watch: { value: def.watch },
        defaultValue: { value: def.value },
        cachedValue: {
            value: def.cache ? cachedValue : undefined,
            writable: def.writable
        }
    });
    return field;
};

Field.prototype.update = function(value, cb){
    var field = this;
    if(!field.writable || field.type === 'function') {
        setTimeout(function(){
            cb(field.type === 'json' ? JSON.parse(field.defaultValue) : field.defaultValue);
        }, 0);
        return;
    }
    value = convertValueToType(value, field.type, field.defaultValue);
    field.update.filter(value, this.node, cb);
};

Field.prototype.exec = function(value, cb){
    var field = this;
    if(field.type !== 'function') {
        setTimeout(function(){
            cb(value);
        }, 0);
        return;
    }
    field.defaultValue.filter(value, this.node, cb);
};

Field.prototype.sync = function(value, cb){
    var field = this;
    if(!field.writable) {
        setTimeout(function(){
            cb(field.type === 'json' ? JSON.parse(field.defaultValue) : field.defaultValue);
        }, 0);
        return;
    }
    field.update.filter(value, this.node, function(value){
        value = convertValueToType(value, field.type, field.defaultValue);
        if(field.cachedValue !== undefined) field.cachedValue = value;
        field.watch.notify(value, this.node);
        cb(value);
    });
};
