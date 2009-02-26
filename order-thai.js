/*
 * Ubiquity Fridge Thai Ordering
 * Author: Mathew Rodley (mrod5488@usyd.edu.au)
 *
 * Note: Regular expressions are used for matching so users
 * can do some fun stuff while ordering. So yes, this is a 
 * feature and not a bug!
 *
 * Note: We have to wait for suggestions to populate the noun type list.
 * This seems to be a limitation of the Ubiquity framework.
 */

/*
 * Can talk to the fridge and return DOM objects of items (Thai Dishes and Dish Types)
 * and place an order for a specific user (defined in prefs: extensions.ubiquity.fridge.user)
 */
ICanTalkToTheFrige = (function() {

  var _cache = {};

  /* Get the fridge user from the FireFox preferences. The default is 13 (Other). */
  var USER = Application.prefs.getValue('extensions.ubiquity.fridge.user', 13);
  var PROVIDER = Application.prefs.getValue('extensions.ubiquity.fridge.provider', 2); 
  var ENDPOINT = Application.prefs.getValue('extensions.ubiquity.fridge.endpoint', 'http://praxis.it.usyd.edu.au/fridge/'); 

  /* I called it this, because I thought It was funny! */
  var OPEN_FRIDGE = function(url) {
    return ENDPOINT + url;

  }

  return {
    each_dish: function(text, callback) {
      var baseUrl = OPEN_FRIDGE('thai/list');
      var params = {user: USER, provider: PROVIDER};
      var fn = function(response) {
        jQuery(response).find('#thaiItems a').each(function(i, item) {
          callback(jQuery(item));
        });
      }
          
      if(_cache['thai_list']) {
        fn(_cache['thai_list']);
      } else {
        jQuery.get( baseUrl, params, function(response) {
          _cache['thai_list'] = response; 
          fn(response);
        });
      }
    },
  
    each_dish_type: function(text, itemId, callback) {
        var baseUrl = OPEN_FRIDGE('thai/thaiItemTypeSelection');
        var params = {user: USER, thaiItem: itemId};
        jQuery.get( baseUrl, params, function(response) {
          jQuery(response).find('#typesList a').each(function(i, item) {
            item = jQuery(item);
            callback(item);
          });
        });
    },

    place_order: function(dish, _with, callback) {
        var baseUrl = OPEN_FRIDGE('thai/order');
        var params = {user: USER, thaiItem: dish.data.id};
    if(dish.data.hasSubTypes == true) {
        params.thaiItemType = _with.data;
    }
        jQuery.get( baseUrl, params, function(response) {
          callback(response); 
        });
    }
  }
})();

/*
 * Collection of possible thai dishes we can order (retreived from the fridge)
 */
noun_type_thaidish = {
  _name: 'Dish',
  suggest: function( text, html, callback ) {
    ICanTalkToTheFrige.each_dish(text, function(item) {
      if(item.find(".name").text().match(text, 'i')) {
        var id = item.attr("href").match(/thaiItem=(\d+)/)[1];
        var img = item.find("img");
        if(!img.attr('src').match(/^http/)) {
          img.attr("src", "http://praxis.it.usyd.edu.au" + img.attr("src")); 
          img.css("height", 150);
        }
    var subtypes = item.find('.button').attr('hasSubtypes') == "true";
        callback(CmdUtils.makeSugg(item.find(".name").text(),item.find(".image").html(), {id: id, hasSubTypes: subtypes}));
      }
    });
    return [];
  }
}
  
/*
 * For the current selected thai dish, this is the subtypes available. e.g. chicken, beef etc.
 * This uses an a fun and interesting hack <3 JavaScript. :)
 */
noun_type_thaidishtype = {
  _name: "Type",
  suggest: function( text, html, callback ) {
    var selected;
    /* Hack: Extract the selectedDish from the cmd functions context */
    (function(){
      selected = this.selectedDish;
    }).apply(CmdUtils.__globalObject["cmd_order-thai"]);
    if(selected.data.hasSubTypes == false) {
      return [CmdUtils.makeSugg("No Subtypes", "&nbsp;", -1)]; /* -1 because we dont actually have a value here (though we do know it by the dish's hasSubTypes */
    }
    if(selected) {
      ICanTalkToTheFrige.each_dish_type(text, selected.data.id, function(item) {
        if(item.find(".name").text().match(text, 'i')) {
          var id = item.attr("href").match(/thaiItemType=(\d+)/)[1];
          var img = item.find("img");
          if(!img.attr('src').match(/^http/)) {
            img.attr("src", "http://praxis.it.usyd.edu.au" + img.attr("src"));
            img.css("height", 150);
          }
          callback(CmdUtils.makeSugg(item.find(".name").text(), item.find(".image").html(), id));
        }
      });
    }
    return [];
  }
}

CmdUtils.CreateCommand({
  name: "order-thai",
  author: { name: "Mathew Rodley", email: "mrod5488@usyd.edu.au"},
  license: "GPL",
  description: "Orders some thai",
  help: "order-thai <what> with <type>",
  takes: {Dish: noun_type_thaidish},
  modifiers: {with: noun_type_thaidishtype},
  modifierDefaults: {with: ""},
  selectedDish: null, /* The currently selected dish - I didnt want to use a global scoped var */
  preview: function( pblock, dish, mods ) {
    if(dish) {
     /* So we know which dish to get the types for */
     this.selectedDish = dish;
    }
    pblock.innerHTML = dish.html + mods.with.html;
  },
  execute: function(dish, mods) {
    ICanTalkToTheFrige.place_order(dish, mods.with, function(response) {
        displayMessage( dish.text + " (with " + mods.with.text + ") " + "has been ordered");
    });
  }
});
    
    

