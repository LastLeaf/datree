var ViewMixin = function ViewMixin(){};
ViewMixin.create = function(){
    return Object.create(ViewMixin.prototype);
};
ViewMixin.prototype = Object.create(Object.prototype, {
    constructor: {
        value: ViewMixin,
        writable: true,
        configurable: true
    }
});

module.exports = ViewMixin;
