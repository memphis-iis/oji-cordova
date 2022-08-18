
Template.__checkName("__IronRouterDynamicTemplateError__");
Template["__IronRouterDynamicTemplateError__"] = new Template("Template.__IronRouterDynamicTemplateError__", (function() {
  var view = this;
  return HTML.DIV({
    style: "width: 600px; margin: 0 auto; padding: 20px;"
  }, "\n    ", HTML.DIV({
    style: "font-size: 18pt; color: #999;"
  }, "\n      ", Blaze.View(function() {
    return Spacebars.mustache(view.lookup("msg"));
  }), "\n    "), "\n  ");
}));
