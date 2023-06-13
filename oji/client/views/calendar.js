import {moment} from 'meteor/momentjs:moment';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

Template.calendar.helpers({
    'calendar': function(){
        allEvents = Events.find({}).fetch();
        calendar = [];
        //get the selected date
        const t = Template.instance();
        displayDate = t.displayDate.get();
        //parse the date
        unixDate = displayDate || new Date();
        //get the month and year
        selectedMonth = displayDate.getMonth() || unixDate.getMonth();
        selectedYear = displayDate.getFullYear() || unixDate.getFullYear();
        selectedDay = displayDate.getDate() || unixDate.getDate();
        //parse into readable format (Day of the week, Month Day, Year)
        const monthNames = ["January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"];
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        calendar.selectedMonth = monthNames[selectedMonth];
        calendar.selectedYear = selectedYear;
        selectedMonthName = monthNames[selectedMonth];
        selectedDate =  selectedMonthName + " " + selectedDay + ", " + selectedYear;
        calendar.selectedDayFull = selectedDate;
        //get the number of days in the month
        daysInAMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        //get the first day of the month
        firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
        //get the last day of the month
        lastDay = new Date(selectedYear, selectedMonth, daysInAMonth).getDay();
        //make into an array, prepending empty days corresponding to days of the week
        for (i = 0; i < firstDay; i++){
            calendar.push({day: ""});
        }
        //add the days of the month
        for (i = 1; i <= daysInAMonth; i++){
            calendar.push({day: i,
            unixDate: new Date(selectedYear, selectedMonth, i).getTime(),
            today: (i == new Date().getDate() && selectedMonth == new Date().getMonth() && selectedYear == new Date().getFullYear()),
            viewdate: (i == displayDate.getDate()),
            });
        }
        //append empty days corresponding to days of the week
        for (i = lastDay; i < 6; i++){
            calendar.push({day: ""});
        }
        //divide into weeks as calendar.weeks
        calendar.weeks = [];
        for (i = 0; i < calendar.length; i+=7){
            calendar.weeks.push(calendar.slice(i, i+7));
        }
        console.log(calendar);
        //get calendar.numberOfEvents and calendar.selectedDayEvents
        calendar.numberOfEvents = 0;
        calendar.selectedDayEvents = [];
        for (i = 0; i < allEvents.length; i++){
            event = allEvents[i];
            eventDate = new Date(event.year, event.month, event.day);
            unixDateWithoutTime = new Date(unixDate.getFullYear(), unixDate.getMonth(), unixDate.getDate());
            console.log(eventDate, unixDate);   
            //check if the event is on the selected day, stripping time
            if (eventDate.getTime() == unixDateWithoutTime.getTime()){
                calendar.numberOfEvents++;
                calendar.selectedDayEvents.push(event);
                //set this day to have event to true
                for (j = 0; j < calendar.weeks.length; j++){
                    for (k = 0; k < calendar.weeks[j].length; k++){
                        if (calendar.weeks[j][k].day == event.day){
                            calendar.weeks[j][k].event = true;
                        }
                    }
                }
            }
        }
        return calendar;
    },
    'selectedDayFull': function(){
        const t = Template.instance();
        displayDate = t.displayDate.get();
        unixDate = new Date();
        unixDate.setDate(displayDate);
        return unixDate.toDateString();
    }
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
        console.log("clicked");
        console.log($('#createEventModal'));
        $('#createEventModal').css('display', 'block');
    },
    'click #closeCreateEventModal': function(event){
        $('#createEventModal').fadeOut();
        $('body').scrollTop(0);
    },
    'click .daySelect': function(event){
        const t = Template.instance();
        //get data-relDay attribute from the clicked element
        newDay = $(event.target).attr('data-date');
        //console.log(newDay);
        //convert from unix time to date object
        unixDate = new Date(parseInt(newDay));
        t.displayDate.set(unixDate);
    },
    'click #prevMonth': function(event){
        const t = Template.instance();
        displayDate = t.displayDate.get();
        console.log(displayDate);
        displayDate.setMonth(displayDate.getMonth() - 1);
        t.displayDate.set(unixDate);
        console.log("clicked");
    },
    'click #nextMonth': function(event){
        const t = Template.instance();
        displayDate = t.displayDate.get();
        displayDate.setMonth(displayDate.getMonth() + 1);
        t.displayDate.set(displayDate);
        console.log(displayDate);
        console.log("clicked");
    }
})

Template.calendar.onCreated(function() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
    unixDate = new Date();
    curMonthName = monthNames[unixDate.getMonth()];
    curYear = unixDate.getFullYear();
    this.displayMonth = new ReactiveVar(false);
    this.displayMonthName = new ReactiveVar(curMonthName);
    daysInAMonth = new Date(unixDate.getMonth() + 1, curYear, 0).getDate();
    this.displayDate = new ReactiveVar(unixDate);
})

