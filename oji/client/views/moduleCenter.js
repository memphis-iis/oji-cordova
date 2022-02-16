Template.moduleCenter.helpers({
    'modules': function(){
        mods = Modules.find();
        console.log('mods', mods);
        return mods;
    },
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