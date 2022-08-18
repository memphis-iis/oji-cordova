Template.journal.helpers({
    'entries': () => Journals.find({}),
});

Template.journal.events({
    'click #createEntry': function(event){
        event.preventDefault();
        data = {};
        data.triggeringEvent= $('#triggeringEvent').val();
        data.mood = $('#mood').val();
        data.automaticThoughts = $('#automaticThoughts').val();
        data.evidenceForThoughts = $('#evidenceForThoughts').val();
        data.evidenceAgainstThoughts = $('#evidenceAgainstThoughts').val();
        data.otherThoughts =  $('#otherThoughts').val();
        data.newMood = $('#newMood').val();
        Meteor.call('addEntry',data);
        Router.go("/calendar/agenda");
    }
});
Template.journal.onCreated(function() {


})

