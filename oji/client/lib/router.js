
/* router.js - the routing logic we use for the application.

If you need to create a new route, note that you should specify a name and an
action (at a minimum). This is good practice, but it also works around a bug
in Chrome with certain versions of Iron Router (they routing engine we use).

*/


//Get collections
Meteor.subscribe('allInvites');
Meteor.subscribe('allOrgs');

//Set Default Template
Router.configure({
  layoutTemplate: 'DefaultLayout'
});

//Set Up Default Router Actions
const defaultBehaviorRoutes = [
  'login'
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

// route organizational invites
Router.route('/signup/:_id', function(){
  // add the subscription handle to our waitlist
  id = parseInt(this.params._id);
  this.wait(Meteor.subscribe('allInvites'));
  // this.ready() is true if all items in the wait list are ready
  if (this.ready()) {
    targetOrg = Invites.findOne({code: id}).targetOrg;
    targetOrgInfo = Orgs.findOne({orgId: targetOrg});
    targetOrgName = targetOrgInfo.orgName;
    targetOrgOwner = targetOrgInfo.ownerEmail;
    console.log(targetOrgName);
    this.render('signup', {
      data: {
        org: targetOrg,
        orgName: targetOrgName,
        orgOwner: targetOrgOwner
      }
    });
  } else {
    this.render('linkNotFound');
  }
});
