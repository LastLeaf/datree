var forEachObject = function(obj, func, cb){
    var c = Object.keys(obj).length;
    if(!c) return cb(), undefined;
    for(var k in obj) {
        func(obj[k], k, function(){
            if(!--c) cb();
        });
    }
};

var forEachArray = function(arr, func, cb){
    var c = arr.length;
    if(!c) return cb(), undefined;
    arr.forEach(function(item, i){
        func(item, i, function(){
            if(!--c) cb();
        });
    });
};

exports.forEach = function(arr, func, cb){
    if(arr instanceof Array) return forEachArray(arr, func, cb);
    return forEachObject(arr, func, cb);
};
