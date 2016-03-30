var View = require('./view');
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

Field.matchValueWithType = function(value, type){
    if(type === 'view') return value instanceof View;
    if(type === 'list') return value instanceof List;
    if(type === 'item') return value instanceof Item;
    if(type === 'string') return typeof(value) === 'string';
    if(type === 'number') return typeof(value) === 'number';
    if(type === 'boolean') return typeof(value) === 'boolean';
    if(type === 'object') return true;
    return false;
};

Field.getTypeByValue = function(value){
    if(value instanceof List) return 'list';
    if(value instanceof Item) return 'item';
    var type = typeof(value);
    if(type === 'string' || type === 'number' || type === 'boolean') return type;
    return 'object';
};

Field.inferLink = function(def, source, selfSchema){
    if(!def) return null;
    if(typeof(def) === 'object') {
        source = def.source || source;
        def = def.link;
    }
    def = String(def);

    // find field
    if(!def.match(/^\~?[a-z][_a-z0-9\.]*/i)) throw new ViewError('Link descriptor "' + def + '" is illegal.');
    var fields = source && source._schema && source._schema.fields;
    if(!fields) throw new ViewError('Source is not found.');
    if(def[0] === '~') {
        def = def.slice(1);
        fields = selfSchema.fields;
    }
    var slices = def.split('.');
    for(var i=0; i<slices.length; i++) {
        var slice = slices[i];
        if(!Object.hasOwnProperty.call(fields, slice)) {
            throw new ViewError('Link descriptor "' + def + '" is not found on the source.');
        }
        fields = fields[slice].fields;
    }

    return {
        source: source,
        path: slices,
        value: fields.value,
        type: fields.type,
        writable: fields.writable,
    };
};

Field.normalizeField = function(viewType, def, schema){
    // detect it is a child view or not
    if(def.view) {
        if(def.view === 'list') return List._prepareSchema(def, schema);
        if(def.view === 'item') return Item._prepareSchema(def, schema);
        throw new ViewError('View type "' + def.view + '" is illegal.');
    }

    // construct field options
    var field = null;
    var source = schema.source || null;
    if(typeof(def) === 'string') {
        field = {
            link: def,
            cache: !!schema.cache || false,
            set: null,
            get: null,
            watch: null,
            value: undefined,
            type: '',
            writable: true,
        }
    } else {
        source = def.source || source;
        field = {
            link: String(def.link || ''),
            cache: !!def.cache || !!schema.cache || false,
            set: def.set || null,
            get: def.get || null,
            watch: def.watch || null,
            value: def.value || undefined,
            type: String(def.type || ''),
            writable: !!def.writable || true,
        };
    }

    // basic validation
    if(field.source && field.source._viewType !== viewType) {
        throw new ViewError('The source view type does not match the destination view type.');
    }

    // type and value
    if(field.type) {
        if(!Field.matchValueWithType(field.value, field.type)) {
            throw new ViewError('Default value [' + field.value + '] does not match type "' + field.type + '".');
        }
        if(field.value === undefined) {
            if(field.type === 'string') field.value = '';
            else if(field.type === 'number') field.value = 0;
            else if(field.type === 'boolean') field.value = false;
            else if(field.type === 'object') field.value = 'null';
            else if(field.type !== 'list' && field.type !== 'item' && field.type !== 'view') {
                throw new ViewError('Field type "' + field.type + '" is illegal.');
            }
        } else {
            if(field.type === 'object') {
                field.value = JSON.stringify(field.value);
            }
        }
    } else if(field.value !== undefined) {
        field.type = Field.getTypeByValue(field.value);
    } else if(!field.link) {
        field.type = 'object';
        field.value = 'null';
    }

    // link inference
    if(field.link) {
        field.link = Field.inferLink(def.link, source, schema);
        if(field.link.type !== field.type) {
            throw new ViewError('Defined type "' + field.type + '" does not match linked type "' + field.link.type + '".');
        }
        if(!field.value) field.value = field.link.value;
        if(!field.link.writable) field.writable = false;
    }

    return field;
};

Field.normalizeSelects = function(def, schema){
    var viewType = def.view;
    var source = def.source || schema.source || null;
    var cache = !!def.cache || !!schema.cache || false;

    if(def.view !== 'list' && def.view !== 'item') throw new ViewError('View type "' + def.view + '" is illegal.');

    var k = '';
    var keyRe = /^[a-z][_a-z0-9]*$/i;
    var fields = {};
    var deferredFields = {};
    schema.fields = fields;

    if(def.select) {
        for(k in def.select) {
            if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
            if(def.select[k].view) {
                deferredFields[k] = def.select[k];
            } else {
                fields[k] = def.select[k];
            }
        }
    } else {
        if(source) {
            for(k in source) {
                if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
                if(def.add && def.add[k]) continue;
                if(def.remove && def.remove.indexOf(k) >= 0) continue;
                fields[k] = k;
            }
        }
        if(def.add) {
            for(k in def.add) {
                if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
                if(def.add[k].view) {
                    deferredFields[k] = def.add[k];
                } else {
                    fields[k] = def.add[k];
                }
            }
        }
    }

    for(var k in fields) {
        fields[k] = Field.normalizeField(viewType, fields[k], {
            source: source,
            cache: cache,
        });
    }
    for(k in deferredFields) {
        fields[k] = Field.normalizeField(viewType, deferredFields[k], {
            source: source,
            cache: cache,
        });
    }
};
