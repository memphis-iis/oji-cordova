import {moment} from 'meteor/momentjs:moment';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

Template.calendar.helpers({
    'calendar': function(){
        allEvents = Events.find({}).fetch();
        calendar = {};
        // get displayed day
        const t = Template.instance();
        displayDay = t.displayDay.get();
        displayMonth = t.displayMonth.get();
        // if display day is not set, set it to today's numeric day
        if(!displayDay){
            //get current day
            displayDay = moment().date();
            calendar.displayDay = displayDay;
            calendar.displayMonth = displayMonth;
        } else {
            calendar.displayDay = displayDay;
            calendar.displayMonth = displayMonth;
        }
        //get an array of this week's numeric days
        var days = [];
        for(var i = 0; i < 7; i++){
            days.push(displayDay - moment().day() + i);
        }
        //for each day in the week, get the english name of the day
        var dayNames = [];
        for(var i = 0; i < 7; i++){
            dayNameShort = moment().date(days[i]).format('ddd');
            dayNames.push(dayNameShort);
        }
        //combine the day names and numeric days into an array of objects
        var daysOfWeek = [];
        for(var i = 0; i < 7; i++){
            month = moment().month();
            today = false;
            if(days[i] == moment().date()){
                today = true;
            }
            //set the date 
            date = moment().date(days[i]).format('YYYY-MM-DD');
            //get the date's numeric day
            day = moment().date(days[i]).format('D');
            daysOfWeek.push({relDay: days[i], dayName: dayNames[i], today: today, date: date, day: day});
            //if the day is today, set today to true
        }
        calendar.daysOfWeek = daysOfWeek;
        calendar.selectedDayFull = moment().date(displayDay).format('dddd, MMMM Do');
        calendar.selectedDayEvents = [];
        //get the events for the selected day
        for(var i = 0; i < allEvents.length; i++){
            //collate month, day and year fields into a single date field with moment
            allEvents[i].date = moment().month(allEvents[i].month).date(allEvents[i].day).year(allEvents[i].year);
            //if the event is on the selected day, add it to the selected day events array
            if(allEvents[i].date.date() == displayDay){
                //convert time to 12 hour local time
                allEvents[i].time = moment(allEvents[i].time, "HH:mm").format("h:mm a");
                calendar.selectedDayEvents.push(allEvents[i]);
            }
        }
        //sort the events by time
        calendar.selectedDayEvents.sort(function(a, b){
            return moment(a.time, "h:mm a").diff(moment(b.time, "h:mm a"));
        });
        //get today's numeric day
        calendar.relToday = moment().date();
        calendar.numberOfEvents = calendar.selectedDayEvents.length;
        return calendar;    
    },
})

Template.calendar.events({
    'click #thoughtlog' : function(event){
        const t = Template.instance();
        t.thoughtlogview.set(true);
        t.exerciseview.set(false);
    },
    "click #exercise": function(event){
        const t = Template.instance();
        t.exerciseview.set(true);
        t.thoughtlogview.set(false);
    },
    'click #createEvent': function(event){
        event.preventDefault();
        var inputDate = $('#date').val();
        console.log(inputDate);
        time =  $('#time').val();
        var date = inputDate.split("-");
        var day = parseInt(date[2]);
        var month = date[1] - 1;
        var year = parseInt(date[0]);
        importance = $('#importance').val();
        type = $('#type').val();
        title = $('#title').val();
        $('#type').val("");
        $('#title').val("");
        $('#time').val("");
        $('#date').val("");
        $('#importance').val("");
        Meteor.call('createEvent', type ,month, day, year, time, title, importance);
    },
    'click #deleteEvent': function(event){
        event.preventDefault();
        eventId = $(event.target).data('id');
        Meteor.call('deleteEvent',eventId);
    },
    'click #openCreateEventModal': function(event){
        $('#createEventModal').show();
        /* fade in the modal and focus on the first input */
        $('#createEventModal').scrollBottom();
    },
    'click #closeCreateEventModal': function(event){
        $('#createEventModal').fadeOut();
        $('body').scrollTop(0);
    },
    'click .daySelect': function(event){
        const t = Template.instance();
        //get data-relDay attribute from the clicked element
        newDay = $(event.target).attr('data-date');
        t.displayDay.set(newDay);
    }
})

Template.calendar.onCreated(function() {
    Meteor.subscribe('events');
    const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
    unixDate = new Date();
    curMonthName = monthNames[unixDate.getMonth()];
    curYear = unixDate.getFullYear();
    this.displayMonth = new ReactiveVar(false);
    this.displayMonthName = new ReactiveVar(curMonthName);
    daysInAMonth = new Date(unixDate.getMonth() + 1, curYear, 0).getDate();
    this.displayYear = new ReactiveVar(curYear);
    this.displayDay = new ReactiveVar(false);
    this.daysInAMonth = new ReactiveVar(daysInAMonth)
    this.thoughtlogview = new ReactiveVar(false);
    this.exerciseview = new ReactiveVar(false);
})

