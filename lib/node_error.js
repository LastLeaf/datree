var NodeError = function DatreeError(){
    var temp = Error.apply(this, arguments);
    temp.name = this.name = 'Datree.Error';
    this.stack = temp.stack;
    this.message = temp.message;
}
NodeError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: NodeError,
        writable: true,
        configurable: true
    }
});

module.exports = NodeError;
