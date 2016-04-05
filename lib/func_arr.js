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

FuncArr.prototype.filter = function(self, args, cb){
    var funcs = this.funcs;
    var i = 0;
    var next = function(){
        if(i === funcs.length) {
            setTimeout(function(){
                cb.apply(self, args);
            }, 0);
            return;
        }
        i++;
        if(funcs[i].async) {
            var funcCalled = false;
            var asyncArgs = args.concat(function(){
                if(funcCalled) throw new NodeError('The callback function has already been called.');
                funcCalled = true;
                for(var j=0; j<args.length; j++) {
                    if(arguments[j] !== undefined) args[j] = arguments[j];
                }
                next();
            });
            funcs[i].apply(self, asyncArgs);
        } else {
            var v = funcs[i].apply(self, args);
            if(v !== undefined) args[0] = v;
        }
    };
    setTimeout(next, 0);
};

module.exports = FuncArr;
