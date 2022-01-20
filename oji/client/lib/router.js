import { Meteor } from 'meteor/meteor';
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
  'signup',
  'createOrg',
  'restricted'
];

//Set Up Logged In Restricted Routes 
const restrictedRoutes = [
  'assessmentCenter'
]


const getDefaultRouteAction = function(routeName) {
  return function() {
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

// set up all routes with restricted to login behavior
for (const route of restrictedRoutes) {
  Router.route('/' + route, function() {
    if(Meteor.userId()){
      this.render(route);
      }else{
        Router.go('/');
      }
    });
  }

// setup home route
Router.route('/', function () {
  this.render('home');
});

// admin control panel route
Router.route('/control-panel', function () {
  if(Meteor.user()){
    if (Roles.userIsInRole(Meteor.user(), 'admin')) {
      this.render('adminControlPanel');
    }
    else if (Roles.userIsInRole(Meteor.user(), 'supervisor')) {
      this.render('supervisorControlPanel');
    }
    else{
      Router.go('/');
    }
  }
  else{
    Router.go('/');
  }
});

// route assessment engine
//intro
Router.route('/assessment/:_id', {
  subscriptions: function(){
    return Meteor.subscribe('curAssessment', this.params._id);
  },
  action: function(){
    this.render('assessment', {
      data:{
        isNotQuestion: true,
      }
    });
  }
});

Router.route('/userAssessmentReport', {
  action: function(){
    this.render('userAssessmentReport');
  }
});
//question
Router.route('/assessment/:_id/:_questionid', {
  subscriptions: function(){
    return Meteor.subscribe('curAssessment', this.params._id);
  },
  action: function(){
    this.render('assessment', {
      data:{
        isNotQuestion: false,
        questionid: this.params._questionid,
      }
    });
  }
});

// route organizational invites
Router.route('/signup/:_id', function(){
  // add the subscription handle to our waitlist
  if(Meteor.user()){
    Router.go('/');
  }
  id = this.params._id;
  Meteor.call('getInviteInfo', id, (err, res) => {
    var {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName} = res;
    if(err || typeof targetOrgId === 'undefined'){
      this.render('linkNotFound');
    } else {
      this.render('signup', {
        data: {
          orgName: targetOrgName,
          supervisorName: targetSupervisorName,
          linkId: id
        }
      });
    }});
  })   
