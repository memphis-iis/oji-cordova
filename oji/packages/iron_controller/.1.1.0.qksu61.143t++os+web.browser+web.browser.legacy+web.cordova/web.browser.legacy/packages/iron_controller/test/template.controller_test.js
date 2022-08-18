
Template.__checkName("ControllerChangeTest");
Template["ControllerChangeTest"] = new Template("Template.ControllerChangeTest", (function() {
  var view = this;
  return [ "Controller-", Blaze.View(function() {
    return Spacebars.mustache(view.lookup("id"));
  }) ];
}));

Template.__checkName("ReactiveStateTest");
Template["ReactiveStateTest"] = new Template("Template.ReactiveStateTest", (function() {
  var view = this;
  return Blaze.View(function() {
    return Spacebars.mustache(view.lookup("postId"));
  });
}));

Template.__checkName("ControllerTest");
Template["ControllerTest"] = new Template("Template.ControllerTest", (function() {
  var view = this;
  return [ "Parent-", Blaze.View(function() {
    return Spacebars.mustache(view.lookup("id"));
  }), "\n  ", Spacebars.include(view.lookupTemplate("ControllerChild")) ];
}));

Template.__checkName("ControllerChild");
Template["ControllerChild"] = new Template("Template.ControllerChild", (function() {
  var view = this;
  return [ "Child-", Blaze.View(function() {
    return Spacebars.mustache(view.lookup("id"));
  }) ];
}));

Template.__checkName("ControllerEventHandler");
Template["ControllerEventHandler"] = new Template("Template.ControllerEventHandler", (function() {
  var view = this;
  return HTML.Raw("<div>\n    TriggerClick\n  </div>");
}));
