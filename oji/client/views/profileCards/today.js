import { moment } from 'meteor/momentjs:moment';

Template.today.helpers({
    'today': function(){
      //get current day, month, and year
        const today = moment();
        const day = today.date();
        const month = today.month();
        const year = today.year();
        //get the events for the selected day
        events = Events.find({day: day, month: month, year: year}).fetch();
        //convert time to 12 hour local time
        for(var i = 0; i < events.length; i++){
            events[i].time = moment(events[i].time, "HH:mm").format("h:mm a");
        }
        //use moment to sort the events by time
        events.sort(function(a, b){
            return moment(a.time, "h:mm a").diff(moment(b.time, "h:mm a"));
        });
        console.log("events: " + events);
        return events[0];
    }
});