import { Meteor } from 'meteor/meteor';
import Chart from 'chart.js/auto'
import { Session } from 'meteor/session';
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
  'congrats',
  'postTreatment'
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
  Router.route('/' + route, {
    name: 'client.' + route,
    subscriptions: function(){
      return [


      ]
    },
    action: function() {
       if(Meteor.userId()){
         this.render(route);
       }else{
        Router.render('home', {
          data: {
            message: "That area is not accessible to users who haven't logged in. Please sign in.",
            alert: "danger"
          }
        });
      }
    },
  });
}

// setup home route
Router.route('/', function () {
  //get session variable overrideCordova
  var overrideCordova = Session.get('overrideCordova');
  if(Meteor.isCordova || overrideCordova){
    if(Meteor.userId()){
      this.render('profile');
    } else {
      this.render('home');
    }
  } else {
    //if not cordova, then render downloadApp if not logged in
    if(!Meteor.userId()){
      console.log("not logged in");
      this.render('downloadApp');
    } else {
      console.log("logged in");
      //if not cordova and logged in, then render home
      this.render('profile');
    }
  }
});

//setup alternate home route
Router.route('/web', function () {
  this.render('home');
});

//setup logout
Router.route('/logout', function(){
  Meteor.logout();
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
  subcriptions: function(){
    //subscribe to all assessments and modules
    return [
      Meteor.subscribe('usertrials'),
      Meteor.subscribe('assessments')
    ]
  },
  action: function(){
    this.render('userAssessmentReportLanding')
  }
});

Router.route('/userAssessmentReport/:_identifier', {
  subcriptions: function(){
    return [
      Meteor.subscribe('usertrials'),
      Meteor.subscribe('assessments')
    ]
  },
  action: function(){
    this.render('userAssessmentReport', {
      params: {
        assessmentIdentifier: this.params._identifier
      }
    });
  }
});

Router.route('/userAssessmentReport/supervisor/:_userid/', {
  subcriptions: function(){
    return [
      Meteor.subscribe('usertrials'),
      Meteor.subscribe('assessments')
    ]
  },
  action: function(){
    this.render('userAssessmentReportLanding', {
      params: {
        userId: this.params._userid,
      }
    });
  }
});

Router.route('/userAssessmentReport/supervisor/:_userid/:_identifier', {
  subcriptions: function(){
    return [
      Meteor.subscribe('usertrials'),
      Meteor.subscribe('assessments')
    ]
  },
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
  action: function(){
    this.render('module', {
      data:{
        moduleId: this.params._id,
        pageId: this.params._pageid,
      }
    });
  }
});

//module quiz page question id
Router.route('/module/:_id/:_pageid/:_questionid', {
  action: function(){
    this.render('module', {
      data:{
        moduleId: this.params._id,
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
  action: function(){
    if(this.ready){
      if(Meteor.user()){
        if (Roles.userIsInRole(Meteor.user(), 'admin') || Roles.userIsInRole(Meteor.user(), 'supervisor')  ) {
          this.render('moduleReport', {
            data:{
              moduleId: this.params._id,
            }
          });
        }
      } else {
        this.render('/');
      }
    }
  }
});

//route image viewer, use :_source passed in to determine which image to display
Router.route(':_source', {
  action: function(){
    if(Meteor.user()){
      this.render('imageViewer', {
        data:{
          source: this.params._source,
        }
      });
    }
  }
});

// route assessments results report
Router.route('/assessmentReport/:_id', {
  action: function(){
    if(Meteor.user()){
        if (Roles.userIsInRole(Meteor.user(), 'admin') || Roles.userIsInRole(Meteor.user(), 'supervisor')  ) {
          this.render('assessmentReport', {
            data:{
              assessmentId: this.params._id,
            }
          });
        } else {
          this.render('/');
        }
    } else {
      this.render('loading');
    }
  }
});

//routing for REST API for organizational data, user data, and assessment data, and module data
//only accessible to authors and admins
Router.route('/api/organizations', {

  action: function(){
   if(Meteor.user()){
    if(Roles.userIsInRole(Meteor.user(), 'admin')){
      //only return organization that the user is the owner of
      var org = Meteor.user().organization;
      var data = Organizations.find({_id: org}).fetch();
      //log the data to colsole as prettefiy json string
      console.log(data);
    } 
    //if user is an author, return all organizations
    else if(Meteor.user().author){
      var data = Organizations.find().fetch();
      console.log(data);
    }
    else {
      console.log(data);
    }
    } else {
      console.log(data);
    }
  }
});

Router.route('/api/assessments', {

  action: function(){
    if(Meteor.user()){
      if(Roles.userIsInRole(Meteor.user(), 'admin')){
        //get all users in the organization
        var org = Meteor.user().organization;
        var users = Meteor.users.find({'organization': org}).fetch();
        var userIds = [];
        for(var i = 0; i < users.length; i++){
          userIds.push(users[i]._id);
        }
        //get all trials for the users
        var trials = Trials.find({'userId': {$in: userIds}}).fetch();
        //return all trials to response
        //log to console as pretty json string
        console.log(trials);
      } 
      //if user is an author, return all
      else if(Meteor.user().author){
        var trials = Trials.find().fetch();
          //log to console as pretty json string
          console.log(trials);
      }
      else {
        //log to console as unauthroized
        console.log('unauthorized');
      }
    } else {
        //log to console as unauthroized
        console.log('unauthorized');
    }
  }
});

Router.route('/api/modules', {

  action: function(){
    if(Meteor.user()){
      //if user is an admin, return all modules for users in the organization
      if(Roles.userIsInRole(Meteor.user(), 'admin')){
        //get all users in the organization
        var org = Meteor.user().organization;
        var users = Meteor.users.find({'organization': org}).fetch();
        var userIds = [];
        for(var i = 0; i < users.length; i++){
          userIds.push(users[i]._id);
        }
        //get all modules for the users
        var modules = ModuleResults.find({'userId': {$in: userIds}}).fetch();
        //return all modules to response
        console.log(modules);
      }
      //if user is an author, return all modules
      else if(Meteor.user().author){
        var modules = ModuleResults.find().fetch();
        console.log(modules);
      }
      else {
                //log to console as unauthroized
                console.log('unauthorized');
      }
    } else {
           //log to console as unauthroized
           console.log('unauthorized');
    }
  }
});

Router.route('/api/users', {

  action: function(){
    if(Meteor.user()){
      //if user is an admin, return all users in the organization, except for firstname, lastname, and email
      if(Roles.userIsInRole(Meteor.user(), 'admin')){
        //get all users in the organization
        var org = Meteor.user().organization;
        var users = Meteor.users.find({'organization': org}).fetch();
        var userIds = [];
        for(var i = 0; i < users.length; i++){
          userIds.push(users[i]._id);
        }
        //get all users for the organization
        var users = Meteor.users.find({'_id': {$in: userIds}}).fetch();
        //remove firstname, lastname, and email from the users
        for(var i = 0; i < users.length; i++){
          delete users[i].firstname;
          delete users[i].lastname;
          delete users[i].emails[0].address;
          //also remove username and password
          delete users[i].username;
          delete users[i].services.password;
        }
        //return all users to response
        console.log(users);
    }
    //if user is an author, return all users
    else if(Meteor.user().author){
      var users = Meteor.users.find().fetch();
      //remove firstname, lastname, and email from the users
      for(var i = 0; i < users.length; i++){
        delete users[i].firstname;
        delete users[i].lastname;
        delete users[i].emails[0].address;
        //also remove username and password
        delete users[i].username;
        delete users[i].services.password;
      }
      //return all users to response
      console.log(users);
    }
    else {
        //log to console as unauthroized
        console.log('unauthorized');
    }
    } else {
        //log to console as unauthroized
        console.log('unauthorized');
    }
  }
});
//statistical summary
Router.route('/api/all', {

  action: function(){
    if(Meteor.user()){
      //if user is an admin, get all users in the organization
      if(Roles.userIsInRole(Meteor.user(), 'admin')){
        //get all users in the organization
        var org = Meteor.user().organization;
        var users = Meteor.users.find({'organization': org}).fetch();
        var userIds = [];
        for(var i = 0; i < users.length; i++){
          userIds.push(users[i]._id);
        }
        //remove firstname, lastname, and email from the users
        for(var i = 0; i < users.length; i++){
          delete users[i].firstname;
          delete users[i].lastname;
          delete users[i].emails[0].address;
          //also remove username and password
          delete users[i].username;
          delete users[i].services.password;
        }
        //get all trials for the users
        var trials = Trials.find({'userId': {$in: userIds}}).fetch();
        //join trials and users on userId
        for(var i = 0; i < trials.length; i++){
          for(var j = 0; j < users.length; j++){
            if(trials[i].userId == users[j]._id){
              trials[i].user = users[j];
            }
          }
        }
        //for each trial set field type to 'assessment'
        for(var i = 0; i < trials.length; i++){
          trials[i].type = 'assessment';
        }
        questionIndex = 0;
        //get all modules for the users
        var modules = ModuleResults.find({'userId': {$in: userIds}}).fetch();
        //get a list of all module ids
        var allModules = [];
        for(var i = 0; i < modules.length; i++){
          thisModule = {
            id: modules[i].moduleId,
            userId: modules[i].userId
          }
            //for each response, flatten into thisModule
            for(var j = 0; j < modules[i].responses.length; j++){
              thisModule['page' + modules[i].responses[j].pageId + 'question' + modules[i].responses[j].questionId] = modules[i].responses[j].response;
              thisModule['page' + modules[i].responses[j].pageId + 'question' + modules[i].responses[j].questionId + 'time'] = modules[i].responses[j].responseTimeStamp;
            }
          }
          //add thisModule to allModules
          allModules.push(thisModule);
        }
        //join modules and users on userId
        for(var i = 0; i < allModules.length; i++){
          for(var j = 0; j < users.length; j++){
            if(allModules[i].userId == users[j]._id){
              allModules[i].user = users[j];
            }
          }
        }
        //for each module set field type to 'module'
        for(var i = 0; i < allModules.length; i++){
          allModules[i].type = 'module';
        }
        //join trials and modules
        var all = {
          assessments: trials,
          modules: allModules
        }
        //return all to response
        console.log(all);
      } else {
        //if user is an author, get all trials
        if(Meteor.user().author){
          var assessments = Trials.find().fetch();
          var modules = ModuleResults.find().fetch();
          //return all to response
          console.log(assessments);
          console.log(modules);
        } else {
             //log to console as unauthroized
             console.log('unauthorized');
        }
      }
}});
