var NodeError = require('./node_error');

var FuncArr = function FuncArr(){};
FuncArr.prototype = Object.create(Object.prototype, {
    constructor: {
        value: FuncArr,
        writable: true,
        configurable: true
    }
});

FuncArr.create = function(arr){
    if(arr instanceof FuncArr) arr = FuncArr.funcs;
    if(!(arr instanceof Array)) arr = [arr];
    var funcs = [];
    arr.forEach(function(func){
        if(typeof(func) === 'function') funcs.push(func);
    });
    var funcArr = Object.create(FuncArr.prototype, {
        funcs: { value: funcs }
    });
    Object.freeze(funcs);
    return funcArr;
};

FuncArr.prototype.filter = function(node, args, cb){
    var funcs = this.funcs;
    var interrupted = false;
    var i = 0;
    var next = function(){
        if(i === funcs.length || interrupted) {
            cb.apply({
                interrupted: interrupted,
                node: node,
            }, args);
            return;
        }
        var func = funcs[i++];
        var self = {
            async: func.async || false,
            interrupted: false,
            node: node,
        };
        var funcCbCalled = false;
        var funcCb = function(){
            if(funcCbCalled) throw new NodeError('The callback function has already been called.');
            funcCbCalled = true;
            if(self.interrupted) {
                interrupted = true;
                next();
                return;
            }
            for(var j=0; j<args.length; j++) {
                if(arguments[j] !== undefined) args[j] = arguments[j];
            }
            next();
        };
        var asyncArgs = args.concat(funcCb);
        func.apply(self, asyncArgs);
        if(!self.async) funcCb();
    };
    next();
};

module.exports = FuncArr;
