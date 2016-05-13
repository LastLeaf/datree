var Shape = require('./shape');
var Lock = require('./lock');
var asyncForEach = require('./async_utils').forEach;

var Node = function Node(){};
Node.prototype = Object.create(Object.prototype, {
    constructor: {
        value: Node,
        writable: true,
        configurable: true
    }
});

// create and destroy
var nodeIdTimestamp = 0;
var nodeIdIncrement = 0;
var generateNodeId = function(){
    var timestamp = Date.now();
    if(timestamp !== nodeIdTimestamp) {
        nodeIdTimestamp = timestamp;
        nodeIdIncrement = 0;
    }
    return timestamp + '$' + (++nodeIdIncrement);
};
var busyShape = null;
var createFromShapeWithBusy = function(shape, parent, busyNode, lock, cb){
    var nodeId = generateNodeId();

    // construct core data
    var node = Object.create(Node.prototype, {
        $id: { value: nodeId },
        $shape: { value: shape },
        $lock: { value: lock },
        $parent: { value: parent },
        $statics: { value: {} },
        $dynamics: { value: {}, writable: shape.dynamic },
        $order: { value: [], writable: shape.dynamic },
        $source: { value: shape.link },
        $destinations: { value: {} },
        $cache: {
            value: shape.cache && shape.type ? (shape.type === 'json' ? JSON.parse(shape.value) : shape.value) : undefined,
            writable: shape.cache && shape.type
        },
        $busy: {
            value: busyNode
        }
    });
    Object.freeze(node.$dynamics);
    Object.freeze(node.$order);

    // optimization for busy node
    if(!busyNode) {
        Object.freeze(node.$statics);
        cb(node);
        return;
    }

    // link to source
    linkNodeToSource(node, function(){
        // construct children
        var staticChildren = node.$statics;
        asyncForEach(shape.type ? {} : shape.fields, function(field, k, cb){
            createFromShape(field, node, lock, function(childNode){
                staticChildren[k] = childNode;
                if(k.match(/^([0-9]+|[_a-z][_a-z0-9]*)$/i)) {
                    Object.defineProperty(node, k, {
                        get: function(){
                            var type = node.$statics[k].$shape.type;
                            if(type === 'function') {
                                return function(cb){
                                    nodeExec(node.$statics[k], cb);
                                };
                            }
                            if(type) return node.$statics[k].$cache;
                            return node.$statics[k];
                        },
                        enumerable: true
                    });
                }
                cb();
            });
        }, function(){
            Object.freeze(staticChildren);
            node.$shape.create.filter(node, [], function(){
                cb(node);
            }, 0);
        });
    });
};
var createFromShape = function(shape, parent, lock, cb){
    busyShape = busyShape || Shape._create({
        value: 0,
        writable: false,
        cache: true
    });
    createFromShapeWithBusy(busyShape, null, null, Lock.create(), function(busyNode){
        createFromShapeWithBusy(shape, parent, busyNode, lock, cb);
    });
};
Node.create = function(shape, cb){
    var tcb = function(node){
        setTimeout(function(){
            cb(node);
        }, 0);
    };
    if(shape instanceof Shape) createFromShape(shape, null, Lock.create(), tcb);
    else createFromShape(Shape._create(shape), null, Lock.create(), tcb);
};
var destroyNode = function(node){
    for(var i=0; i<node.$destinations.length; i++) {
        destroyNode(node.$destinations[i]);
    }
    unlinkNodeFromSource(node);
    clearBusy(node);
    node.$shape.destroy.filter(node, [], function(){});
};
Node.prototype.destroy = function(){
    if(this.$parent) removeChildBusy(this.$parent, this);
    destroyNode(this);
};

// get static information
Node.prototype.getShape = function(){
    return this.$shape;
};
Node.prototype.getParent = function(){
    return this.$parent;
};
Node.prototype.getFieldName = function(){
    return this.$shape.parentPath;
};
Node.prototype.getCachedValue = function(childName){
    if(childName === undefined) return this.$cache;
    var child = this.$statics[String(childName)] || this.$dynamics[String(childName)];
    if(!child) return;
    return child.$cache;
};
Node.prototype.getStaticChild = function(childName){
    return this.$statics[String(childName)];
};
Node.prototype.getDynamicChild = function(childName){
    return this.$dynamics[String(childName)];
};
Node.prototype.getChild = function(childName){
    return this.$statics[String(childName)] || this.$dynamics[String(childName)];
};
Node.prototype.get = function(childName){
    if(childName === undefined) return this.$cache;
    return this.$statics[String(childName)] || this.$dynamics[String(childName)];
};
Node.prototype.getDescendant = Node.prototype._getDescendant = function(childName){
    if(!childName) return this;
    var node = this;
    var slices = String(childName).split('/');
    while(slices.length) {
        var slice = decodeURIComponent(slices.shift());
        node = node.$statics[slice] || node.$dynamics[slice];
        if(!node) return;
    }
    return node;
};
Node.prototype.getDynamicChildren = function(){
    return this.$order;
};
Node.prototype.forEach = function(func){
    return this.$order.forEach(func);
};

// busy state
var increaseBusy = function(node){
    for(; node; node = node.$parent) {
        node.$busy.$update(node.$busy.$cache + 1);
    }
};
var decreaseBusy = function(node){
    for(; node; node = node.$parent) {
        if(node.$busy.$cache > 0) node.$busy.$update(node.$busy.$cache - 1);
    }
};
var removeChildBusy = function(node, removedChild){
    node.$busy.$update(node.$busy.$cache - removedChild.$busy.$cache);
};
var clearBusy = function(node){
    node.$busy.$update(0);
};
Node.prototype.isBusy = function(childName){
    if(childName === undefined) return !!this.$busy.$cache;
    var child = this.$statics[String(childName)] || this.$dynamics[String(childName)];
    if(!child) return;
    return !!child.$busy.$cache;
};
Node.prototype.getBusyNode = function(childName){
    if(childName === undefined) return this.$busy;
    var child = this.$statics[String(childName)] || this.$dynamics[String(childName)];
    if(!child) return;
    return this.$busy;
};

// transform
var createDynamicChild = function(node, fieldName, def, cb){
    if(!node.$shape.dynamic || node.$source) {
        return cb(), undefined;
    }
    var shape = Shape._create(def, null, node.$shape, String(fieldName));
    createFromShape(shape, node, node.$lock, cb);
};
Node.prototype.createField = function(fieldName, def, cb){
    var tcb = function(node){
        setTimeout(function(){
            cb(node);
        }, 0);
    };
    createDynamicChild(this, fieldName, def, tcb);
};
Node.prototype.transform = function(def, cb){
    var shape = Shape._create(def, this);
    createFromShape(shape, null, Lock.create(), cb);
};
Node.combine = function(nodes, filters, cb){
    var def = {
        fields: {},
        cache: false,
        request: filters.request,
        update: filters.update,
        updateFields: filters.updateFields,
    };
    nodes.forEach(function(node){
        if(!(node instanceof Node) || node.$shape.type) return;
        for(var k in node.$shape.fields) {
            def.fields[k] = node.$statics[k];
        }
    });
    var shape = Shape._create(def);
    createFromShape(shape, null, Lock.create(), cb);
};

// data flow
var linkNodeToSource = function(node, cb){
    var source = node.$source;
    var destination = node;
    if(!source) return cb(), undefined;
    if(!source.$shape.type && !source.$shape.dynamic) return cb(), undefined;
    requestTransferData(source, destination, undefined, function(){
        source.destinations[destination.$id] = destination;
        cb();
    });
};
var unlinkNodeFromSource = function(node){
    var source = node.$source;
    var destination = node;
    if(source) delete source.$destinations[destination.$id];
};
var requestTransferData = function(source, destination, cb){
    if(!source.$shape.type) {
        transferFields(source, destination, source.$order, cb);
    } else if(source.$cache === undefined) {
        requestTransferData(source.$source, source, cb);
    } else {
        transferValue(source, destination, source.$cache, cb);
    }
};
var updateInAncestorChain = function(node, path, args, cb){
    var funcArr = node.$shape.update;
    if(node.$shape.type) funcArr = node.$shape.updateFields;
    var execFuncArr = function(){
        funcArr.filter(node, args.concat(path), cb);
    };
    if(node.$parent) {
        updateInAncestorChain(node.$parent, encodeURIComponent(node.$shape.parentPath) + (path ? '/' + path : ''), args, function(){
            if(this.interrupted) {
                cb.apply({interrupted: true}, args);
                return;
            }
            for(var i=0; i<args.length; i++) {
                if(arguments[i] !== undefined) args[i] = arguments[i];
            }
            execFuncArr();
        });
    } else {
        execFuncArr();
    }
};

// update fields
var updateNodeProperties = function(node, addChildren, removeChildren){
    addChildren.forEach(function(child){
        var fieldName = child.$shape.parentPath;
        if(Object.prototype.hasOwnProperty.call(node, fieldName)) return;
        if(!fieldName.match(/^([0-9]+|[_a-z][_a-z0-9]*)$/i)) return;
        Object.defineProperty(node, fieldName, {
            get: function(){
                var type = node.$dynamics[fieldName].$shape.type;
                if(type === 'function') {
                    return function(cb){
                        nodeExec(node.$dynamics[fieldName], cb);
                    };
                }
                if(type) return node.$dynamics[fieldName].$cache;
                return node.$dynamics[fieldName];
            },
            enumerable: true,
            configurable: true,
        });
    });
    removeChildren.forEach(function(child){
        var fieldName = child.$shape.parentPath;
        if(node.$statics[fieldName] || node.$dynamics[fieldName]) return;
        delete node[fieldName];
    });
};
var nodeUpdateFields = function(node, newOrder, unlockCb, cb){
    var newDynamics = {};
    var oldOrder = node.$order;
    var diff = (newOrder.length !== oldOrder.length);
    newOrder.forEach(function(childNode, i){
        newDynamics[childNode.$shape.parentPath] = childNode;
        if(childNode !== oldOrder[i]) diff = true;
    });
    if(!diff) return unlockCb(), cb(), undefined;
    node.$dynamics = newDynamics;
    node.$order = newOrder;
    updateNodeProperties(node, newOrder, oldOrder);
    unlockCb();
    asyncForEach(node.$destinations, function(dest, k, cb){
        transferFields(dest, newOrder, cb);
    }, cb);
};
var transferFields = function(destination, sourceChildNodes, cb){
    var newOrder = new Array(sourceChildNodes.length);
    asyncForEach(sourceChildNodes, function(sourceChildNode, i, cb){
        var oldNode = destination.$dynamics[sourceChildNode.$shape.parentPath];
        if(oldNode.$source === sourceChildNode) {
            newOrder[i] = oldNode;
            cb();
            return;
        }
        createDynamicChild(destination, sourceChildNode.$shape.parentPath, {
            link: sourceChildNode
        }, function(node){
            newOrder[i] = node;
            cb();
        });
    }, function(){
        destination.$lock.wait(function(unlock){
            updateInAncestorChain(destination, '', [newOrder], function(){
                if(!this.interrupted) {
                    nodeUpdateFields(destination, newOrder, unlock, cb);
                } else {
                    unlock();
                    cb();
                }
            });
        });
    });
};
Node.prototype.updateFields = function(childName, nodesOrder, cb){
    var node = this;
    var tcb = function(){
        setTimeout(function(){
            cb.call(node);
        }, 0);
    };
    if(typeof(nodesOrder) === 'function' || nodesOrder === undefined) {
        cb = nodesOrder;
        nodesOrder = childName;
    } else {
        node = this.$statics[childName] || this.$dynamics[childName];
    }
    cb = cb || function(){};
    if(!node) {
        return tcb();
    }
    var newOrder = [];
    var newParentPathUsed = {};
    nodesOrder.forEach(function(newNode){
        if(!(newNode instanceof Node) || newNode.$parent !== node) return;
        if(Object.prototype.hasOwnProperty.call(newParentPathUsed, newNode.$shape.parentPath)) return;
        newParentPathUsed[newNode.$shape.parentPath] = true;
        newOrder.push(newNode);
    });
    if(node.$shape.dynamic && !node.$source) {
        nodeUpdateFields(node, newOrder, function(){}, tcb);
    } else {
        tcb();
    }
};

// update value
var nodeUpdate = function(node, value, unlockCb, cb){
    if(node.$cache !== undefined) {
        if(node.$cache === value) return unlockCb(), cb(), undefined;
        node.$cache = value;
    }
    unlockCb();
    asyncForEach(node.$destinations, function(dest, k, cb){
        transferValue(dest, value, cb);
    }, cb);
};
var transferValue = function(destination, value, cb){
    destination.$lock.wait(function(unlock){
        updateInAncestorChain(destination, '', [value], function(value){
            if(!this.interrupted) {
                nodeUpdate(destination, value, unlock, cb);
            } else {
                unlock();
                cb();
            }
        });
    });
};
Node.prototype.update = function(childName, value, cb){
    var node = this;
    var tcb = function(){
        setTimeout(function(){
            cb.call(node);
        }, 0);
    };
    if(typeof(value) === 'function' || value === undefined) {
        cb = value;
        value = childName;
    } else {
        node = this.$statics[childName] || this.$dynamics[childName];
    }
    cb = cb || function(){};
    if(!node) {
        return tcb();
    }
    value = convertValueToType(value, node.$shape.type, node.$shape.value);
    if(value !== undefined && !node.$source) {
        nodeUpdate(node, value, function(){}, tcb);
    } else {
        tcb();
    }
};

// modification requests
var requestInAncestorChain = function(node, path, args, cb){
    var funcArr = node.$shape.request;
    if(node.$shape.type === 'function') funcArr = node.$shape.value;
    funcArr.filter(node, args.concat(path), function(){
        if(this.interrupted) {
            cb.apply({interrupted: true}, args);
            return;
        }
        for(var i=0; i<args.length; i++) {
            if(arguments[i] !== undefined) args[i] = arguments[i];
        }
        if(node.$parent) {
            requestInAncestorChain(node.$parent, encodeURIComponent(node.$shape.parentPath) + (path ? '/' + path : ''), args, cb);
        } else {
            cb.apply({interrupted: false}, args);
        }
    });
};
var requestInSourceChain = function(node, args, cb){
    increaseBusy(node);
    node.$lock.wait(function(unlock){
        requestInAncestorChain(node, '', args, function(){
            var source = node.$source;
            for(var i=0; i<args.length; i++) {
                if(arguments[i] !== undefined) args[i] = arguments[i];
            }
            if(source && source.$shape.type !== 'function') {
                args[i] = convertValueToType(args[i], source, source.$shape.value);
                if(args[i] === undefined) this.interrupted = true;
            }
            decreaseBusy(node);
            if(!source || this.interrupted) {
                cb.call(node);
                unlock();
                return;
            }
            requestInSourceChain(source, args, function(){
                cb.call(node);
            });
            unlock();
        });
    });
};
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
};
Node.prototype.request = function(childName, value, cb){
    var node = this;
    var tcb = function(){
        setTimeout(function(){
            cb.call(node);
        });
    };
    if(typeof(value) === 'function') {
        cb = value;
        value = childName;
    } else {
        node = this.$statics[childName] || this.$dynamics[childName];
    }
    cb = cb || function(){};
    if(!node || !node.$shape.writable) {
        return tcb();
    }
    value = convertValueToType(value, node.$shape.type, node.$shape.value);
    if(value === undefined) {
        return tcb();
    }
    requestInSourceChain(node, [value], tcb);
};
var nodeExec = function(node, cb){
    cb = cb || function(){};
    requestInSourceChain(node, [], cb);
};
Node.prototype.exec = function(cb){
    var node = this;
    var tcb = function(){
        setTimeout(function(){
            cb.call(node);
        });
    };
    if(node.$shape.type !== 'function') {
        tcb();
        return;
    }
    nodeExec(node, tcb);
};

for(var k in Node.prototype) {
    Node.prototype['$' + k] = Node.prototype[k];
}
module.exports = Node;
