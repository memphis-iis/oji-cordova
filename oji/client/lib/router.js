
/* router.js - the routing logic we use for the application.

If you need to create a new route, note that you should specify a name and an
action (at a minimum). This is good practice, but it also works around a bug
in Chrome with certain versions of Iron Router (they routing engine we use).

*/

//Set Default Template
Router.configure({
  layoutTemplate: 'DefaultLayout'
});

//Set Up Default Router Actions
const defaultBehaviorRoutes = [
  'login',
  'signup'
];


const getDefaultRouteAction = function(routeName) {
  return function() {
    console.log(routeName + ' ROUTE');
    this.render(routeName);
  };
};

// set up all routes with default behavior
for (const route of defaultBehaviorRoutes) {
  Router.route('/' + route, {
    name: 'client.' + route,
    action: getDefaultRouteAction(route),
  });
}

// setup home route
Router.route('/', function () {
  this.render('home');
});

// admin control panel route
Router.route('/admin-control-panel', function () {
  if(Meteor.user()){
    if (Roles.userIsInRole(Meteor.user(), ['admin'])) {
      this.render('adminControlPanel');
    }
    else{
      Router.go('/');
    }
  }
  else{
    Router.go('/');
  }
});
