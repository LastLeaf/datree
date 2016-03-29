var ViewError = function(){
    var temp = Error.apply(this, arguments);
    temp.name = this.name = 'ViewError';
    this.stack = temp.stack;
    this.message = temp.message;
}
ViewError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: ViewError,
        writable: true,
        configurable: true
    }
});
