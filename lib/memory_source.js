var MemorySource = function MemorySource(){};
MemorySource.create = function(){
    return Object.create(MemorySource.prototype);
};
MemorySource.prototype = Object.create(Object.prototype, {
    constructor: {
        value: MemorySource,
        writable: true,
        configurable: true
    }
});

module.exports = MemorySource;
