Template.moduleCenter.helpers({
    'nextModule': function(){
        nextModule = Meteor.users.findOne({_id: Meteor.userId()}).nextModule;
        mod = Modules.findOne({order: nextModule})
        return mod;
    },
    'completedModules':function(){
        nextModule = Meteor.users.findOne({_id: Meteor.userId()}).nextModule;
        mods = Modules.find({"order": {$lt: nextModule}}).fetch();
        return mods;
    }
})

Template.moduleCenter.events({
    'click .startAssessment': function(event){
        event.preventDefault();
        target = "/module/" + event.target.id;
        window.location.href = target;
    },
})

Template.moduleCenter.onCreated(function() {
    Meteor.subscribe('modules');
})