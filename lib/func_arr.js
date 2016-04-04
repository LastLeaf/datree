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

FuncArr.prototype.filterSync = function(value, self){
    for(var i=0; i<this.funcs.length; i++) {
        var modifiedValue = this.funcs[i].call(self || null, value);
        if(modifiedValue !== undefined) value = modifiedValue;
    }
    return value;
};

FuncArr.prototype.filter = function(value, self, cb){
    if(typeof(self) === 'function') {
        cb = self;
        self = null;
    }
    var funcs = this.funcs;
    var i = 0;
    var next = function(){
        if(i >= funcs.length) {
            setTimeout(function(){
                cb(value);
            }, 0);
            return;
        }
        i++;
        this.funcs[i].call(self || null, value, function(modifiedValue){
            if(modifiedValue !== undefined) value = modifiedValue;
            next();
        });
    };
    setTimeout(next, 0);
};

FuncArr.prototype.notifySync = function(value, self){
    for(var i=0; i<this.funcs.length; i++) {
        this.funcs[i].call(self || null, value);
    }
};

FuncArr.prototype.notify = function(value, self){
    var funcs = this.funcs;
    for(var i=0; i<funcs.length; i++) {
        setTimeout(function(){
            funcs[i].call(self || null, value);
        }, 0);
    }
};

module.exports = FuncArr;
