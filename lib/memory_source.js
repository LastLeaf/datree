var MemorySource = function(){};
MemorySource.name = 'Datree.MemorySource';
MemorySource.prototype = Object.create(Object.prototype, {
    constructor: {
        value: MemorySource,
        writable: true,
        configurable: true
    }
});

module.exports = MemorySource;
