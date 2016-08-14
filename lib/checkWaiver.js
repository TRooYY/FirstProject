modules.exports = {
    checkWaivers : function(req, res, next){
        var cart = req.session.cart;
        if (!cart) return next();
        if(cart.some(function(i){return i.product.requiresWaiver;})){
            if(!cart.warnings) cart.warnings = [];
            cart.warnings.push('One or more of your selected');
        }
        next();
    },
    checkGuestCounts: function(req, res,next){
        var cart = req.session.cart;
        if (!cart) return next();
        if(cart.some(function(i){return i.guests > i.product .maximumGuests;})){
            if(!cart.errors) cart.errors = [];
            cart.errors.push('One or more of your selected');
        }
        next();
    }
}
