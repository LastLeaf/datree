var View = require('./view');
var ViewError = require('./view_error');
var FuncArr = require('./func_arr');

var Schema = function(){};
Schema.name = 'Dbview.Schema';
Schema.prototype = Object.create(Object.prototype, {
    constructor: {
        value: Schema,
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
                mutable: MUTABLE_OR_NOT
                update: () => UPDATER
                sync: () => FETCHER
                watch: () => FETCHER
                type: Number || String || Boolean || List || Item || Mixed
                value: DEFAULT_VALUE
            }
        }
        remove: ['FIELD_TO_REMOVE']
        orderBy: ORDER_BY
        skip: SKIP
        limit: LIMIT
        having: {
            HAVING_FIELD: CONST_OR_LINK
        }
        where: {
            WHERE_OPERATORS: ...
        }
        filters: {
            link: () => FUNC
            sync: () => FUNC
            watch: () => FUNC
            insert: () => FUNC
            remove: () => FUNC
            update: () => FUNC
        }
    }
*/

var matchValueWithType = function(value, type){
    if(type === 'view') return value instanceof View;
    if(type === 'string') return typeof(value) === 'string';
    if(type === 'number') return typeof(value) === 'number';
    if(type === 'boolean') return typeof(value) === 'boolean';
    if(type === 'object') return true;
    return false;
};

var getTypeByValue = function(value){
    if(value instanceof View) return 'view';
    var type = typeof(value);
    if(type === 'string' || type === 'number' || type === 'boolean') return type;
    return 'object';
};

var inferLink = function(link, source, selfSchema){
    if(!link) return null;
    link = String(link);

    // find field
    if(source && !(source instanceof View)) throw new ViewError('Source could only be another view.');
    var schema = source && View.getSchema.call(source);
    if(link[0] === '~') {
        if(!selfSchema) throw new ViewError('Links to other fields in the view is not allowed in selects fields');
        link = link.slice(1);
        schema = selfSchema;
        source = null;
    }
    if(!schema) throw new ViewError('Source is not found.');
    var parentLevel = 0;
    while(link[0] === '.') {
        schema = schema.parent;
        if(!schema) throw new ViewError('Source parent is not found.');
        link = link.slice(1);
    }
    var fields = schema.fields[link];
    if(!fields) throw new ViewError('The linked field is not found on the source.');

    return Object.freeze({
        source: source,
        parent: parentLevel,
        link: link,
        value: fields.value,
        type: fields.type,
        mutable: fields.mutable,
    });
};

var normalizeField = function(def, schema){
    // detect it is a child view or not
    if(typeof(def.source) !== undefined) return Schema.create(def, schema);

    // construct field options
    var field = null;
    var source = schema.source || null;
    if(typeof(def) === 'string') {
        field = {
            link: String(def || ''),
            cache: !!schema.cache || false,
            update: FuncArr.create(),
            sync: FuncArr.create(),
            watch: FuncArr.create(),
            value: undefined,
            type: '',
            mutable: true,
        }
    } else {
        source = def.source || source;
        field = {
            link: String(def.link || ''),
            cache: !!def.cache || !!schema.cache || false,
            update: FuncArr.create(def.update || null),
            sync: FuncArr.create(def.sync || null),
            watch: FuncArr.create(def.watch || null),
            value: def.value || undefined,
            type: String(def.type || ''),
            mutable: !!def.mutable || true,
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
            else if(field.type === 'object') field.value = 'null';
            else if(field.type !== 'view') {
                throw new ViewError('Field type "' + field.type + '" is illegal.');
            }
        } else {
            if(field.type === 'object') {
                field.value = JSON.stringify(field.value);
            }
        }
    } else if(field.value !== undefined) {
        field.type = getTypeByValue(field.value);
    } else if(!field.link) {
        field.type = 'object';
        field.value = 'null';
    }

    // link inference
    if(field.link) {
        field.link = inferLink(def.link, source);
        if(field.link.type !== field.type) {
            throw new ViewError('Defined type "' + field.type + '" does not match linked type "' + field.link.type + '".');
        }
        if(field.link.mutable !== field.mutable) {
            throw new ViewError('Defined mutable option does not match linked mutable option.');
        }
        if(field.link.value !== field.value) {
            throw new ViewError('Defined initial value does not match linked initial value.');
        }
    }

    return Object.freeze(field);
};

var normalizeSelects = function(def, schema){
    var source = def.source || schema.source || null;
    var cache = !!def.cache || !!schema.cache || false;

    var k = '';
    var keyRe = /^([_a-z][_a-z0-9])$/i;
    var fields = {};
    var deferredFields = {};
    schema.fields = fields;

    if(def.select) {
        for(k in def.select) {
            if(!keyRe.test(k)) throw new ViewError('Field name "' + k + '" is illegal.');
            if(def.select[k].source) {
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
                if(def.add[k].source) {
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
        fields[k] = normalizeField(deferredFields[k], {
            source: source,
            cache: cache,
        });
    }

    if(!fields._id) throw new ViewError('The "_id" field is not defined.');
    if(!fields._id.mutable) throw new ViewError('The "_id" field could not be defined as mutable.');
    if(!fields._id.type) throw new ViewError('The "_id" field only supports "number" or "string" type.');

    Object.freeze(fields);
};

Schema.create = function(def, parentSchema){
    // basic config
    var source = def.source || (parentSchema && parentSchema.source) || null;
    if(source && !(source instanceof View)) throw new ViewError('Source could only be another view.');
    var cache = def.cache || (parentSchema && parentSchema.cache) || false;
    var filters = def.filters || {};
    filters = {
        link: FuncArr.create(filters.link),
        sync: FuncArr.create(filters.sync),
        insert: FuncArr.create(filters.insert),
        remove: FuncArr.create(filters.remove),
        update: FuncArr.create(filters.update),
    };
    Object.freeze(filters);

    // create schema
    var schema = Object.create(Schema.prototype);
    schema.parent = parentSchema || null;
    schema.source = source;
    schema.cache = cache;
    schema.filters = filters;
    schema.fields = null;
    schema.having = null;
    schema.where = null;
    schema.orderBy = '';
    schema.skip = -1;
    schema.limit = -1;

    // normalize fields
    normalizeSelects({
        select: def.select,
        add: def.add,
        remove: def.remove,
    }, schema);

    var sourceSchema = source && View.getTransformer.call(source);

    // TODO parse having and where with immutable links

    // TODO parse _id

    // parse orderBy, skip, limit
    var orderBy = def.orderBy || '';
    var skip = def.skip || -1;
    var limit = def.limit || -1;
    if(typeof(orderBy) === 'object') {
        orderBy = inferLink(orderBy, source, schema);
        if(orderBy.type !== 'string') throw new ViewError('The "orderBy" field can only link to a string field.');
        if(orderBy.mutable) throw new ViewError('The "orderBy" field could not link to a mutable field.');
    }
    if(typeof(skip) === 'object') {
        skip = inferLink(skip, source, schema);
        if(skip.type !== 'number') throw new ViewError('The "skip" field can only link to a number field.');
        if(skip.mutable) throw new ViewError('The "orderBy" field could not link to a mutable field.');
    }
    if(typeof(limit) === 'object') {
        limit = inferLink(limit, source, schema);
        if(limit.type !== 'string') throw new ViewError('The "limit" field can only link to a number field.');
        if(limit.mutable) throw new ViewError('The "orderBy" field could not link to a mutable field.');
    }
    if(sourceSchema.orderBy) {
        if(orderBy) throw new ViewError('The "orderBy" has already been set on the source.');
        schema.orderBy = sourceSchema.orderBy;
    } else {
        schema.orderBy = orderBy;
    }
    if(sourceSchema.skip) {
        if(skip) throw new ViewError('The "skip" has already been set on the source.');
        schema.orderBy = sourceSchema.skip;
    } else {
        schema.skip = skip;
    }
    if(sourceSchema.limit) {
        if(limit) throw new ViewError('The "limit" has already been set on the source.');
        schema.orderBy = sourceSchema.limit;
    } else {
        schema.limit = limit;
    }

    return Object.freeze(schema);
};

module.exports = Schema;
