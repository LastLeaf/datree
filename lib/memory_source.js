var MemorySource = function MemorySource(){};
MemorySource.prototype = Object.create(Object.prototype, {
    constructor: {
        value: MemorySource,
        writable: true,
        configurable: true
    }
});

// TODO

module.exports = MemorySource;
