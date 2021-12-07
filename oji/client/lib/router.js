
/* router.js - the routing logic we use for the application.

If you need to create a new route, note that you should specify a name and an
action (at a minimum). This is good practice, but it also works around a bug
in Chrome with certain versions of Iron Router (they routing engine we use).

*/

//Set Default Template
Router.configure({
  layoutTemplate: 'home'
});

Router.route('/', {
  name: 'home',
  template: 'home'
});

Router.route('/login', {
  name: 'login',
  template: 'login'
})