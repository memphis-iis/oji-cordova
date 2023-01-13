import { Meteor } from 'meteor/meteor';
import Chart from 'chart.js/auto'
/* router.js - the routing logic we use for the application.

If you need to create a new route, note that you should specify a name and an
action (at a minimum). This is good practice, but it also works around a bug
in Chrome with certain versions of Iron Router (they routing engine we use).

*/



//Set Default Template
if(Meteor.isCordova || Session.get('overrideCordova')){
  Router.configure({
    layoutTemplate: 'DefaultLayout'
  });
} else {
  //if not logged in, then render downloadApp
  if(!Meteor.userId()){
    Router.configure({
      layoutTemplate: 'DefaultLayout-Web'
    });
  } else {
    //if logged in, then render home
    Router.configure({
      layoutTemplate: 'DefaultLayout'
    });
  }
}

//Set Up Default Router Actions
const defaultBehaviorRoutes = [
  'login',
  'signup',
  'restricted',
  'code'
];

//Set Up Logged In Restricted Routes 
const restrictedRoutes = [
  'assessmentCenter',
  'createOrg',
  'profile',
  'moduleCenter',
  'calendar',
  'journal',
  'devtest',
  'postAssessmentPrompt',
  'certifcates',
  'goals',
  'messages',
  'information',
  'modulesAdmin',
  'usersAdmin',
  'relaxationTechniques',
  'welcome',
  'awards',
]


const getDefaultRouteAction = function(routeName) {
  return function() {
      this.render('routeName');
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
        this.render('home', {
          data: {
            message: "That area is not accessible to users who haven't logged in. Please sign in.",
            alert: "danger"
          }
        });
      }
    });
  }

// setup home route
Router.route('/', function () {
  //if cordova, then render home
  console.log("isCordova: " + Meteor.isCordova);
  console.log("overrideCordova: " + Session.get('overrideCordova'));
  if(Meteor.isCordova){
    console.log("isCordova");
    this.render('home');
  } else {
    //if not cordova, then render downloadApp if not logged in
    if(!Meteor.userId()){
      console.log("not logged in");
      this.render('downloadApp');
    } else {
      console.log("logged in");
      //if not cordova and logged in, then render home
      this.render('home');
    }
  }

});

//setup logout
Router.route('/logout', function(){
  Meteor.logout();
  //set overrideCordova to false
  Session.set('overrideCordova', false);
  window.location = '/';
})

// admin control panel route
Router.route('/control-panel', function () {
  if(Meteor.user()){
      this.render('adminControlPanel');
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

//route to today's agenda 
Router.route('/calendar/agenda', {
  action: function(){
    this.render('calendar', {
      data:{
        agendaView: true,
      }
    });
  }
});

Router.route('/userAssessmentReport/', {
  action: function(){
    this.render('userAssessmentReportLanding', {
      params: {
        assessmentIdentifier: this.params._identifier
      }
    });

  }
});

Router.route('/userAssessmentReport/:_identifier', {
  action: function(){
    this.render('userAssessmentReport', {
      params: {
        assessmentIdentifier: this.params._identifier
      }
    });
  }
});

Router.route('/userAssessmentReport/supervisor/:_userid/', {
  action: function(){
    this.render('userAssessmentReportLanding', {
      params: {
        userId: this.params._userid,
      }
    });
  }
});

Router.route('/userAssessmentReport/supervisor/:_userid/:_identifier', {
  action: function(){
    this.render('userAssessmentReport', {
      params: {
        userId: this.params._userid,
        assessmentIdentifier: this.params._identifier
      }
    });
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
// editing assessments
Router.route('/assessmentEditor/:_assessmentid', {
  action: function(){
    this.render('assessmentEditor', {
      data:{
        assessmentid: this.params._assessmentid,
      }
    });
  }
});
// editing modules
Router.route('/moduleEditor/:_moduleId', {
  action: function(){
    this.render('moduleEditor', {
      data:{
        moduleId: this.params._moduleId,
      }
    });
  }
});

// route module engine
//intro
Router.route('/module/:_id', {
  subscriptions: function(){
    return Meteor.subscribe('curModule', this.params._id);
  },
  action: function(){
    if(this.ready){
    this.render('module', {
      data:{
        moduleId: this.params._id,
      }});
    } else {
      this.render('loading');
    } 
  }
});

//module page id
Router.route('/module/:_id/:_pageid', {
  subscriptions: function(){
    return Meteor.subscribe('curModule', this.params._id);
  },
  action: function(){
    this.render('module', {
      data:{
        pageId: this.params._pageid,
      }
    });
  }
});

//module quiz page question id
Router.route('/module/:_id/:_pageid/:_questionid', {
  subscriptions: function(){
    subs = [];
    subs.push(Meteor.subscribe('curModule', this.params._id));
    subs.push(Meteor.subscribe('getUserModuleResults'));
    return subs;
  },
  action: function(){
    this.render('module', {
      data:{
        pageId: this.params._pageid,
        questionId: this.params._questionid,
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
          supervisorId: targetSupervisorId,
          linkId: id
        }
      });
    }});
  })

// route module results report
Router.route('/moduleReport/:_id', {
  waitOn: function(){
   return Meteor.subscribe('getModuleResultsByTrialId', this.params._id);
  },
  action: function(){
    if(this.ready){
      if(Meteor.user()){
        if (Roles.userIsInRole(Meteor.user(), 'admin') || Roles.userIsInRole(Meteor.user(), 'supervisor')  ) {
          this.render('moduleReport');
        }
      } else {
        this.render('/');
      }
    }
  }
});
// route assessments results report
Router.route('/assessmentReport/:_id', {
  subscriptions: function(){
    subs = [];
    subs.push(Meteor.subscribe('getAssessmentsResultsByTrialId', this.params._id));
    return subs;
  },
  action: function(){
    if(this.ready){
      if(Meteor.user()){
        if (Roles.userIsInRole(Meteor.user(), 'admin') || Roles.userIsInRole(Meteor.user(), 'supervisor')  ) {
          this.render('assessmentReport');
        }
      } else {
        this.render('/');
      }
    } else {
      this.render('loading');
    }
  }
});
//Route Static Assets
