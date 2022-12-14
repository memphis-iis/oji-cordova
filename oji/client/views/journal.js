Template.journal.helpers({
    'entries': function(){
        id = Template.instance().selectedDay.get();
        entries = Journals.find().fetch();
        if(id){
            //find the entry for the selected id
            mostRecentEntry = entries.find(function(entry){
                return entry._id == id;
            });
        }else{
            curDate = moment().startOf('day').unix();
            mostRecentEntry = entries[0];
        }
        console.log("entries: " + entries.length);
        entries.atLeastOneEntry = false;
        //convert all dates to long format
        for(var i = 0; i < entries.length; i++){
            entries[i].longDate = moment(entries[i].unixDate).format("dddd, MMMM Do YYYY");
            entries[i].shortDate = moment(entries[i].unixDate).format("MMM Do");
            //get truncated triggeringEvent, don't cut off in the middle of a word
            entries[i].truncatedTriggeringEvent = entries[i].triggeringEvent;
            if(entries[i].truncatedTriggeringEvent.length > 30){
                entries[i].truncatedTriggeringEvent = entries[i].truncatedTriggeringEvent.substring(0, 30);
                entries[i].truncatedTriggeringEvent = entries[i].truncatedTriggeringEvent.substring(0, Math.min(entries[i].truncatedTriggeringEvent.length, entries[i].truncatedTriggeringEvent.lastIndexOf(" ")));
                entries[i].truncatedTriggeringEvent += "...";
            }
    
        }
        //check if most recent entry is for today

        if(mostRecentEntry){
            mostRecentEntryDate = moment(mostRecentEntry.unixDate);
            //get most recent entry date's day's unix timestamp for that day
            mostRecentEntryDate = moment(mostRecentEntryDate).startOf('day').unix();
            if(mostRecentEntryDate == curDate){
                mostRecentEntry.isToday = true;
            }
        } else {
            console.log("no most recent entry");
            mostRecentEntry = false;
        }
        entries.mostRecentEntry = mostRecentEntry;
        console.log("mostRecentEntryDate: " + mostRecentEntryDate);
        console.log("curDate: " + curDate);
        console.log("entries: " + JSON.stringify(entries));
        console.log("mostRecentEntry: " + JSON.stringify(mostRecentEntry));
        console.log("isToday: " + mostRecentEntry.isToday);
        return entries;
    }
});

Template.journal.events({
    'click #next': function(event){
        event.preventDefault();
        template = Template.instance();
        currentCard = template.currentCard.get();
        currentCardHandle = $('#card' + currentCard);
        currentCardHandle.hide();
        nextCardHandle = $('#card' + (currentCard + 1));
        nextCardHandle.show();
        currentCard++;
        template.currentCard.set(currentCard);
        $('#prompt').hide();
        $('#prompt2').hide();
        $('.selectDate').hide();
    },
    'click #prev': function(event){
        event.preventDefault();
        template = Template.instance();
        currentCard = template.currentCard.get();
        currentCardHandle = $('#card' + currentCard);
        currentCardHandle.hide();
        prevCardHandle = $('#card' + (currentCard - 1));
        prevCardHandle.show();
        currentCard--;
        template.currentCard.set(currentCard);
        $('#prompt').hide();
        $('#prompt2').hide();
        $('.selectDate').hide();
    },

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
        $('#card7').show();
        $('#prompt').show();
        $('#prompt2').show();
        $('.selectDate').show();
    },
    'click #stopLog': function(event){
        //clear all fields
        $('#triggeringEvent').val("");
        $('#mood').val("");
        $('#automaticThoughts').val("");
        $('#evidenceForThoughts').val("");
        $('#evidenceAgainstThoughts').val("");
        $('#otherThoughts').val("");
        $('#newMood').val("");
        $('#prompt').show();
        //hide all cards
        template = Template.instance();
        currentCard = template.currentCard.get();
        currentCardHandle = $('#card' + currentCard);
        currentCardHandle.hide();
        template.currentCard.set(-1);
        $('#prompt2').show();
        $('#prompt').show();
        $('.selectDate').show();
    },
    'change #dateSelect': function(event){
        event.preventDefault();
        console.log("change");
        id = $(event.target).val();
        console.log("id: " + id);
        template = Template.instance();
        template.selectedDay.set(id);
    },
});
Template.journal.onCreated(function() {
    // new reactive var for current card
    this.currentCard = new ReactiveVar(-1);
    curDate = new Date().getTime();
    this.selectedDay = new ReactiveVar(false);
})

