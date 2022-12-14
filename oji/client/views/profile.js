Template.profile.helpers({
    'assignment': function(){
        const user = Meteor.user();
        const modules = Modules.find({}).fetch();
        const assessments = Assessments.find({}).fetch();
        if(user && modules.length > 0 && assessments.length > 0){
            assigned = user.assigned;
            assignment = {};
            if(assigned.length === 0){
                assignment = false;
            } else {
                assignment.show = true;
                assignment.isAssessment = false;
                assignment.isModule = false;
                if(assigned[0].type == "assessment"){
                    assignment = Assessments.findOne({_id: assigned[0].assignment});
                    assignment.isAssessment = true;
                    assignment.id = assigned[0].assignment._id;
                }

                if(assigned[0].type == "module"){
                    assignment = Modules.findOne({_id: assigned[0].assignment});
                    assignment.isModule = true;
                }
            }
            console.log("assignment: " + JSON.stringify(assignment));
            return assignment;
        }
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
        const org = Orgs.findOne();
        if(user && org.newUserAssignments.length > 0){
            if(user){
                return user.hasCompletedFirstAssessment;
            }
        } else {
            return true;
        }
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
})


Template.profile.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('modules');
    Meteor.subscribe('files.images.all');
})