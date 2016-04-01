var FuncArr = function(){};
FuncArr.name = 'Datree.FuncArr';
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
    this.busy++;
    for(var i=0; i<this.funcs.length; i++) {
        var modifiedValue = this.funcs[i].call(self || null, value);
        if(modifiedValue !== undefined) value = modifiedValue;
    }
    this.busy--;
    return value;
};

FuncArr.prototype.filter = function(value, self, cb){
    if(typeof(self) === 'function') {
        cb = self;
        self = null;
    }
    this.busy++;
    var funcArr = this;
    var funcs = this.funcs;
    var i = 0;
    var next = function(){
        if(i >= funcs.length) {
            funcArr.busy--;
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
    this.busy++;
    for(var i=0; i<this.funcs.length; i++) {
        this.funcs[i].call(self || null, value);
    }
    this.busy--;
};

FuncArr.prototype.notify = function(value, self){
    this.busy++;
    var funcs = this.funcs;
    for(var i=0; i<funcs.length; i++) {
        setTimeout(function(){
            funcs[i].call(self || null, value);
        }, 0);
    }
    this.busy--;
};
