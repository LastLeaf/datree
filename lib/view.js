var View = function View(){};
View.create = function(){
    return Object.create(View.prototype);
};
View.prototype = Object.create(Object.prototype, {
    constructor: {
        value: View,
        writable: true,
        configurable: true
    }
});

module.exports = View;
