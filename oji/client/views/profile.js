Template.profile.helpers({
    'assignment': function(){
        const user = Meteor.user();
        return user.assigned;
    },
    'certificates': function(){
        files = Files.find({"meta.user": Meteor.userId()}).fetch();
        certificates = [];
        for(let cert of files){
            moduleTitle = 'Oji Completion'
            if(cert.meta.moduleId !== "completion"){
                moduleTitle = Modules.findOne({_id: cert.meta.moduleId}).title;
            }
            certificates.push({
                file: cert.name,
                link: Files.link(cert),
                moduleTitle: moduleTitle
            });
        }
        console.log(certificates);
        return certificates;
    },
    'hasCompletedFistTimeAssessment': function(){
        const user = Meteor.user();
        return user.hasCompletedFirstAssessment;
    },
    'hasCompletedIntervention': function(){
        const user = Meteor.user();
        return user.assessmentSchedule === "postTreatment";
    }
})

Template.profile.events({
    'click #startJourney': function(){
        const user = Meteor.user();
        const org = Orgs.findOne();
        //set user's startedJourney to true
        Meteor.call('startJourney', user._id);
        if(user && org){
            //get user assignments
            assignments = user.assigned;
            //if the length of the assignments array is greater than 1
            if(assignments.length >= 1){
                //get first assignment
                assignment = assignments[0];
                Meteor.call('setCurrentAssignment', assignment.assignment);
                target = `/${assignment.type}/` + assignment.assignment;
                Router.go(target);
            } else {
                Router.go('/')
            }
        } else {
            Router.go('/');
        }
    },
    'click #welcome': function(){
        target = "/welcome/";
        Router.go(target);
    },
    'click #assessmentCenter': function(){
        target = "/assessmentCenter/";
        Router.go(target);
    },
    'click #moduleCenter': function(){
        target = "/moduleCenter/";
        Router.go(target);
    },
    'click #controlPanel': function(){
        target = "/control-panel/";
        Router.go(target);
    },
    'click #calendar': function(){
        target = "/calendar/";
        Router.go(target);
    },
    'click #dashboard': function(){
        target = "/userAssessmentReport/";
        Router.go(target);
    },
    'click #journal': function(){
        target = "/journal/";
        Router.go(target);
    },
    'click #exercises': function(){
        target = "/relaxationTechniques/";
        Router.go(target);
    },
    'click #logout': function(){
        Meteor.logout();
        Router.go("/");
    },
    'click #continueJourney': function(){
        //get user assignments
        const assigned = Meteor.user().assigned;
        //get the user's current assessment Schedule
        const schedule = Meteor.user().assessmentSchedule;
        //if the assessment schedule is postTreatment, then continue on to the next assessment
        if(schedule === "postTreatment"){
            assignment = assigned[0];
            Meteor.call('setCurrentAssignment', assignment.assignment);
            target = "/postTreatment";
            Router.go(target);
        }
        //if the schedule is intervention, then continue on to the next assessment
        if(schedule === "intervention"){
            assignment = assigned[0];
            Meteor.call('setCurrentAssignment', assignment.assignment);
            target = "postAssessmentPrompt";
            Router.go(target);
        }
        //if the schedule is preOrientation, then continue on to the next assessment
        if(schedule === "preOrientation"){
            assignment = assigned[0];
            Meteor.call('setCurrentAssignment', assignment.assignment);
            target = "/welcome";
            Router.go(target);
        }
    },
})


Template.profile.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('modules');
    Meteor.subscribe('files.images.all');
})