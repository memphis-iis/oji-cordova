
Template.__checkName("Static");
Template["Static"] = new Template("Template.Static", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      template: Spacebars.call("NoData")
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("DynamicTemplate"));
  });
}));

Template.__checkName("StaticData");
Template["StaticData"] = new Template("Template.StaticData", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      template: Spacebars.call("WithData"),
      data: Spacebars.call(view.lookup("getData"))
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("DynamicTemplate"));
  });
}));

Template.__checkName("Dynamic");
Template["Dynamic"] = new Template("Template.Dynamic", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      template: Spacebars.call(view.lookup("getTemplate"))
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("DynamicTemplate"));
  });
}));

Template.__checkName("DynamicData");
Template["DynamicData"] = new Template("Template.DynamicData", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      template: Spacebars.call("WithData"),
      data: Spacebars.call(view.lookup("getData"))
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("DynamicTemplate"));
  });
}));

Template.__checkName("DynamicParentData");
Template["DynamicParentData"] = new Template("Template.DynamicParentData", (function() {
  var view = this;
  return Spacebars.With(function() {
    return Spacebars.call(view.lookup("getData"));
  }, function() {
    return [ "\n    ", Blaze._TemplateWith(function() {
      return {
        template: Spacebars.call("WithData")
      };
    }, function() {
      return Spacebars.include(view.lookupTemplate("DynamicTemplate"));
    }), "\n  " ];
  });
}));

Template.__checkName("DynamicParentDataOnTemplateDynamic");
Template["DynamicParentDataOnTemplateDynamic"] = new Template("Template.DynamicParentDataOnTemplateDynamic", (function() {
  var view = this;
  return [ "\n  ", Blaze._TemplateWith(function() {
    return {
      template: Spacebars.call("_DynamicParentDataOnTemplateDynamic"),
      data: Spacebars.call(view.lookup("getData"))
    };
  }, function() {
    return Spacebars.include(function() {
      return Spacebars.call(Template.__dynamic);
    });
  }) ];
}));

Template.__checkName("_DynamicParentDataOnTemplateDynamic");
Template["_DynamicParentDataOnTemplateDynamic"] = new Template("Template._DynamicParentDataOnTemplateDynamic", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      template: Spacebars.call("WithData")
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("DynamicTemplate"));
  });
}));

Template.__checkName("InheritedParentData");
Template["InheritedParentData"] = new Template("Template.InheritedParentData", (function() {
  var view = this;
  return Spacebars.With(function() {
    return "outer";
  }, function() {
    return [ "\n    ", Spacebars.With(function() {
      return "inner";
    }, function() {
      return [ "\n      ", Blaze._TemplateWith(function() {
        return {
          template: Spacebars.call("WithDataAndParentData")
        };
      }, function() {
        return Spacebars.include(view.lookupTemplate("DynamicTemplate"));
      }), "\n    " ];
    }), "\n  " ];
  });
}));

Template.__checkName("DynamicWithBlock");
Template["DynamicWithBlock"] = new Template("Template.DynamicWithBlock", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      template: Spacebars.call(view.lookup("getTemplate"))
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("DynamicTemplate"), function() {
      return "\n    default\n  ";
    });
  });
}));

Template.__checkName("NoData");
Template["NoData"] = new Template("Template.NoData", (function() {
  var view = this;
  return "NoData";
}));

Template.__checkName("WithData");
Template["WithData"] = new Template("Template.WithData", (function() {
  var view = this;
  return [ "WithData-", Blaze.View(function() {
    return Spacebars.mustache(view.lookup("."));
  }) ];
}));

Template.__checkName("WithDataAndParentData");
Template["WithDataAndParentData"] = new Template("Template.WithDataAndParentData", (function() {
  var view = this;
  return [ "WithDataAndParentData-", Blaze.View(function() {
    return Spacebars.mustache(view.lookup("."));
  }), "-", Blaze.View(function() {
    return Spacebars.mustache(view.lookup(".."));
  }) ];
}));

Template.__checkName("One");
Template["One"] = new Template("Template.One", (function() {
  var view = this;
  return "One";
}));

Template.__checkName("Two");
Template["Two"] = new Template("Template.Two", (function() {
  var view = this;
  return "Two";
}));

Template.__checkName("EventsTest");
Template["EventsTest"] = new Template("Template.EventsTest", (function() {
  var view = this;
  return HTML.Raw('<div class="click">\n  Trigger Click\n</div>');
}));

Template.__checkName("LookupHostTest");
Template["LookupHostTest"] = new Template("Template.LookupHostTest", (function() {
  var view = this;
  return Blaze.View(function() {
    return Spacebars.mustache(view.lookup("getValue"));
  });
}));

Template.__checkName("LookupHostDepTest");
Template["LookupHostDepTest"] = new Template("Template.LookupHostDepTest", (function() {
  var view = this;
  return [ Blaze.View(function() {
    return Spacebars.mustache(view.lookup("getValueFromTemplate"));
  }), "\n", Blaze.View(function() {
    return Spacebars.mustache(view.lookup("getValueFromHost"));
  }) ];
}));
