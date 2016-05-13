var testStructure = [];
var testPos = testStructure;

window.describe = function(str, cb){
    var item = {
        str: str,
        sub: [],
    };
    testPos.push(item);
    var prevPos = testPos;
    testPos = item.sub;
    cb();
    testPos = prevPos;
};
window.before = function(cb){
    testPos.push({
        str: '',
        cb: cb,
    });
};
window.it = function(str, cb){
    testPos.push({
        str: str,
        cb: cb,
    });
};

require('../test/memory_source');

var testSub = function(structure, cb){
    var i = 0;
    var next = function(){
        if(i >= structure.length) return cb(), undefined;
        var item = structure[i++];
        if(item.str) console.log(item.str);
        if(item.sub) testSub(item.sub, next);
        else if(item.cb) {
            if(item.cb.length) item.cb(next);
            else item.cb(), next();
        }
    };
    next();
};
testSub(testStructure, function(){
    console.log('END');
});
